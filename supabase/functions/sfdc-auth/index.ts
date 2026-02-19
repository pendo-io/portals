import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { code, redirectUri } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("SFDC_CLIENT_ID");
    const clientSecret = Deno.env.get("SFDC_CLIENT_SECRET");
    const sfdcLoginUrl = Deno.env.get("SFDC_LOGIN_URL") || "https://login.salesforce.com";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "SFDC credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Exchange code for tokens
    const tokenResponse = await fetch(
      `${sfdcLoginUrl}/services/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("SFDC token exchange failed:", err);
      return new Response(
        JSON.stringify({ error: "Failed to exchange authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, instance_url, issued_at } = tokenData;

    // 2. Get user identity from SFDC
    const userInfoResponse = await fetch(
      `${instance_url}/services/oauth2/userinfo`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!userInfoResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch Salesforce user info" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.email;
    const fullName = userInfo.name;
    const sfdcUserId = userInfo.user_id;
    const orgId = userInfo.organization_id;
    const avatarUrl = userInfo.picture;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "No email returned from Salesforce" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create or find Supabase user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try to find existing user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email === email
    );

    let userId: string;
    let sessionToken: string;

    if (existingUser) {
      userId = existingUser.id;

      // Generate a magic link to create a session
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });

      if (linkError || !linkData) {
        console.error("Failed to generate session link:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract the token hash from the link properties
      const tokenHash = linkData.properties?.hashed_token;
      if (!tokenHash) {
        return new Response(
          JSON.stringify({ error: "Failed to extract session token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the OTP to get a real session
      const { data: sessionData, error: sessionError } =
        await supabaseAdmin.auth.verifyOtp({
          token_hash: tokenHash,
          type: "magiclink",
        });

      if (sessionError || !sessionData.session) {
        console.error("Failed to verify OTP:", sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      sessionToken = sessionData.session.access_token;

      // Return the full session
      const session = sessionData.session;

      // 4. Update profile with SFDC metadata
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
        salesforce_user_id: sfdcUserId,
        salesforce_org_id: orgId,
        salesforce_instance_url: instance_url,
        last_login: new Date().toISOString(),
      });

      // 5. Store SFDC tokens
      await supabaseAdmin.from("sfdc_tokens").upsert({
        user_id: userId,
        access_token,
        refresh_token,
        instance_url,
        issued_at: new Date(parseInt(issued_at)).toISOString(),
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Create new user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            avatar_url: avatarUrl,
            provider: "salesforce",
            salesforce_user_id: sfdcUserId,
            salesforce_org_id: orgId,
          },
        });

      if (createError || !newUser.user) {
        console.error("Failed to create user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;

      // The handle_new_user trigger will create the profile and user_role.
      // Update profile with SFDC-specific fields
      await supabaseAdmin.from("profiles").update({
        salesforce_user_id: sfdcUserId,
        salesforce_org_id: orgId,
        salesforce_instance_url: instance_url,
        last_login: new Date().toISOString(),
      }).eq("id", userId);

      // Store SFDC tokens
      await supabaseAdmin.from("sfdc_tokens").upsert({
        user_id: userId,
        access_token,
        refresh_token,
        instance_url,
        issued_at: new Date(parseInt(issued_at)).toISOString(),
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Generate session for new user
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });

      if (linkError || !linkData) {
        return new Response(
          JSON.stringify({ error: "Failed to create session for new user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenHash = linkData.properties?.hashed_token;
      const { data: sessionData, error: sessionError } =
        await supabaseAdmin.auth.verifyOtp({
          token_hash: tokenHash!,
          type: "magiclink",
        });

      if (sessionError || !sessionData.session) {
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          session: {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("sfdc-auth error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
