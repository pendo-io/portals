import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_MAX_CALLS = 100;
const RATE_LIMIT_WINDOW_MINUTES = 60;
const CLARI_BASE_URL = "https://api.clari.com/v4";

serve(async (req) => {
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
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // Parse request
    // ============================================================
    const body = await req.json();
    const { action, oppIds, exportId } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing required field: action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validActions = [
      "get_opportunities",
      "queue_forecast_export",
      "check_export_status",
      "get_export_results",
    ];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Valid actions: ${validActions.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // SECURITY LAYER 2: Rate limiting
    // ============================================================
    const { data: rateLimitOk } = await supabaseAdmin.rpc("check_api_rate_limit", {
      _user_id: user.id,
      _api_name: "clari",
      _max_calls: RATE_LIMIT_MAX_CALLS,
      _window_minutes: RATE_LIMIT_WINDOW_MINUTES,
    });

    if (!rateLimitOk) {
      await supabaseAdmin.from("api_audit_log").insert({
        user_id: user.id,
        api_name: "clari",
        action: "RATE_LIMITED",
        request_params: {},
        response_status: 429,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Maximum ${RATE_LIMIT_MAX_CALLS} calls per ${RATE_LIMIT_WINDOW_MINUTES} minutes`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // SECURITY LAYER 3: Get API key from secure vault
    // ============================================================
    const CLARI_API_KEY = Deno.env.get("CLARI_API_KEY");
    if (!CLARI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // SECURITY LAYER 4: Audit log the API call
    // ============================================================
    const auditParams = {
      action,
      oppIds: oppIds || null,
      exportId: exportId || null,
      requestedBy: user.email,
    };

    await supabaseAdmin.from("api_audit_log").insert({
      user_id: user.id,
      api_name: "clari",
      action,
      request_params: auditParams,
      response_status: null,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      user_agent: req.headers.get("user-agent"),
    });

    // ============================================================
    // Make secure API call to Clari
    // ============================================================
    let clariResponse: Response;
    let clariData: unknown;

    try {
      let endpoint = "";
      let method = "GET";
      let fetchBody: string | undefined;

      switch (action) {
        case "get_opportunities": {
          if (!oppIds || !Array.isArray(oppIds) || oppIds.length === 0) {
            return new Response(
              JSON.stringify({ error: "Missing required field: oppIds (array of opportunity IDs)" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          endpoint = `/opportunities?oppIds=${oppIds.join(",")}`;
          break;
        }
        case "queue_forecast_export": {
          endpoint = "/forecast/export";
          method = "POST";
          fetchBody = JSON.stringify({ format: "json" });
          break;
        }
        case "check_export_status": {
          if (!exportId) {
            return new Response(
              JSON.stringify({ error: "Missing required field: exportId" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          endpoint = `/forecast/export/${exportId}`;
          break;
        }
        case "get_export_results": {
          if (!exportId) {
            return new Response(
              JSON.stringify({ error: "Missing required field: exportId" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          endpoint = `/forecast/export/${exportId}/results`;
          break;
        }
      }

      const url = `${CLARI_BASE_URL}${endpoint}`;
      console.log(`Calling Clari API: ${action}`);

      const doFetch = () =>
        fetch(url, {
          method,
          headers: {
            apikey: CLARI_API_KEY,
            "Content-Type": "application/json",
          },
          ...(fetchBody ? { body: fetchBody } : {}),
        });

      clariResponse = await doFetch();

      // Retry once on 502/503 after 2s delay
      if (clariResponse.status === 502 || clariResponse.status === 503) {
        console.log(`Clari API returned ${clariResponse.status}, retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
        clariResponse = await doFetch();
      }

      if (!clariResponse.ok) {
        const errorText = await clariResponse.text();
        console.error(`Clari API error [${clariResponse.status}]:`, errorText);

        await supabaseAdmin.from("api_audit_log").insert({
          user_id: user.id,
          api_name: "clari",
          action: `${action}_ERROR`,
          request_params: { ...auditParams, error: errorText.substring(0, 500) },
          response_status: clariResponse.status,
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
          user_agent: req.headers.get("user-agent"),
        });

        return new Response(
          JSON.stringify({
            error: "Clari API error",
            status: clariResponse.status,
            message: errorText.substring(0, 200),
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      clariData = await clariResponse.json();
    } catch (fetchError) {
      console.error("Clari API fetch error:", fetchError);

      await supabaseAdmin.from("api_audit_log").insert({
        user_id: user.id,
        api_name: "clari",
        action: `${action}_NETWORK_ERROR`,
        request_params: { ...auditParams, error: String(fetchError) },
        response_status: 500,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });

      return new Response(
        JSON.stringify({ error: "Failed to connect to Clari API" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // Log successful call
    // ============================================================
    const durationMs = Date.now() - startTime;
    await supabaseAdmin.from("api_audit_log").insert({
      user_id: user.id,
      api_name: "clari",
      action: `${action}_SUCCESS`,
      request_params: { ...auditParams, duration_ms: durationMs },
      response_status: 200,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      user_agent: req.headers.get("user-agent"),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: clariData,
        meta: { duration_ms: durationMs, action },
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
