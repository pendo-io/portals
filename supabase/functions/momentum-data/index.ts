import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://pendoportals.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Rate limit: 100 calls per hour per user (increased for development)
const RATE_LIMIT_MAX_CALLS = 100;
const RATE_LIMIT_WINDOW_MINUTES = 60;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ============================================================
    // SECURITY LAYER 1: Verify authentication
    // ============================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client (with user's auth)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client (for audit logging and rate limit checks)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // Parse request
    // ============================================================
    const body = await req.json();
    const { action, salesforceId, accountName, attendeeEmail, fromDate, toDate, pageSize } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing required field: action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // SECURITY LAYER 2: Role-based access control
    // For get_meetings: regular users can only see their own meetings
    // Super admins can query any email
    // ============================================================
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    const isSuperAdmin = !!roleData;

    // For get_meetings action, enforce email security
    let effectiveEmail = attendeeEmail;
    if (action === "get_meetings") {
      if (!isSuperAdmin) {
        // Regular users can ONLY query their own email
        effectiveEmail = user.email;
      } else if (!attendeeEmail) {
        // Super admin must provide an email or use their own
        effectiveEmail = user.email;
      }
    } else {
      // For non-get_meetings actions, non-admins use their own email context
      if (!isSuperAdmin) {
        effectiveEmail = user.email;
      }
    }

    // Validate action types
    const validActions = ["get_calls", "get_call_summary", "get_account_insights", "get_meetings"];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Valid actions: ${validActions.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // SECURITY LAYER 3: Rate limiting
    // ============================================================
    const { data: rateLimitOk } = await supabaseAdmin.rpc("check_api_rate_limit", {
      _user_id: user.id,
      _api_name: "momentum",
      _max_calls: RATE_LIMIT_MAX_CALLS,
      _window_minutes: RATE_LIMIT_WINDOW_MINUTES,
    });

    if (!rateLimitOk) {
      console.error("Rate limit exceeded for user:", user.email);
      
      await supabaseAdmin.from("api_audit_log").insert({
        user_id: user.id,
        api_name: "momentum",
        action: "RATE_LIMITED",
        request_params: {},
        response_status: 429,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });

      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          message: `Maximum ${RATE_LIMIT_MAX_CALLS} calls per ${RATE_LIMIT_WINDOW_MINUTES} minutes` 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // SECURITY LAYER 4: Get API key from secure vault
    // ============================================================
    const MOMENTUM_API_KEY = Deno.env.get("MOMENTUM_API_KEY");
    if (!MOMENTUM_API_KEY) {
      console.error("MOMENTUM_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error: API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // SECURITY LAYER 5: Audit log the API call BEFORE execution
    // ============================================================
    const auditParams = {
      action,
      salesforceId: salesforceId || null,
      accountName: accountName || null,
      attendeeEmail: effectiveEmail || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      requestedBy: user.email,
      isSuperAdmin,
    };

    await supabaseAdmin.from("api_audit_log").insert({
      user_id: user.id,
      api_name: "momentum",
      action: action,
      request_params: auditParams,
      response_status: null,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      user_agent: req.headers.get("user-agent"),
    });

    // ============================================================
    // Make secure API call to Momentum.io
    // ============================================================
    let momentumResponse;
    let momentumData;

    try {
      const momentumBaseUrl = "https://api.momentum.io/v1";
      let endpoint = "";
      let queryParams = new URLSearchParams();

      switch (action) {
        case "get_calls":
          endpoint = "/calls";
          if (salesforceId) queryParams.set("salesforce_id", salesforceId);
          if (accountName) queryParams.set("account_name", accountName);
          break;
        case "get_call_summary":
          endpoint = "/calls/summary";
          if (salesforceId) queryParams.set("salesforce_id", salesforceId);
          break;
        case "get_account_insights":
          endpoint = "/accounts/insights";
          if (salesforceId) queryParams.set("salesforce_id", salesforceId);
          if (accountName) queryParams.set("account_name", accountName);
          break;
        case "get_meetings":
          endpoint = "/meetings";
          // Email filter (enforced by security layer)
          if (effectiveEmail) {
            queryParams.set("attendeeEmailAddresses", effectiveEmail);
          }
          // Date range (last 7 days by default)
          if (fromDate) {
            queryParams.set("from", fromDate);
          } else {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            queryParams.set("from", weekAgo.toISOString());
          }
          if (toDate) {
            queryParams.set("to", toDate);
          } else {
            queryParams.set("to", new Date().toISOString());
          }
          // Pagination
          queryParams.set("pageSize", String(pageSize || 50));
          break;
      }

      const url = `${momentumBaseUrl}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log(`Calling Momentum API: ${action} for ${effectiveEmail || 'N/A'}`);
      
      const doFetch = () => fetch(url, {
        method: "GET",
        headers: {
          "X-API-Key": MOMENTUM_API_KEY,
          "Content-Type": "application/json",
        },
      });

      momentumResponse = await doFetch();

      // Retry once on 502/503 after 2s delay
      if (momentumResponse.status === 502 || momentumResponse.status === 503) {
        console.log(`Momentum API returned ${momentumResponse.status}, retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        momentumResponse = await doFetch();
      }

      if (!momentumResponse.ok) {
        const errorText = await momentumResponse.text();
        console.error(`Momentum API error [${momentumResponse.status}]:`, errorText);
        
        await supabaseAdmin.from("api_audit_log").insert({
          user_id: user.id,
          api_name: "momentum",
          action: `${action}_ERROR`,
          request_params: { ...auditParams, error: errorText.substring(0, 500) },
          response_status: momentumResponse.status,
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
          user_agent: req.headers.get("user-agent"),
        });

        return new Response(
          JSON.stringify({ 
            error: "Momentum API error",
            status: momentumResponse.status,
            message: errorText.substring(0, 200),
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      momentumData = await momentumResponse.json();

    } catch (fetchError) {
      console.error("Momentum API fetch error:", fetchError);
      
      await supabaseAdmin.from("api_audit_log").insert({
        user_id: user.id,
        api_name: "momentum",
        action: `${action}_NETWORK_ERROR`,
        request_params: { ...auditParams, error: String(fetchError) },
        response_status: 500,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });

      return new Response(
        JSON.stringify({ error: "Failed to connect to Momentum API" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // Log successful call
    // ============================================================
    const durationMs = Date.now() - startTime;
    await supabaseAdmin.from("api_audit_log").insert({
      user_id: user.id,
      api_name: "momentum",
      action: `${action}_SUCCESS`,
      request_params: { ...auditParams, duration_ms: durationMs },
      response_status: 200,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      user_agent: req.headers.get("user-agent"),
    });

    // ============================================================
    // Return data (API key never leaves the server!)
    // ============================================================
    return new Response(
      JSON.stringify({
        success: true,
        data: momentumData,
        meta: {
          duration_ms: durationMs,
          action,
          queriedEmail: effectiveEmail,
          isSuperAdmin,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
