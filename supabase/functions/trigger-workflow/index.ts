import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://pendoportals.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function isAllowedWebhookUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "https:") return false;
    const host = url.hostname;
    // Block localhost, loopback, and private IP ranges (SSRF prevention)
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return false;
    if (/^10\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false;
    if (host.endsWith(".internal") || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify auth
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { workflowId, formData } = await req.json();
    if (!workflowId) {
      return new Response(JSON.stringify({ error: "workflowId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to get webhook URL (hidden from client)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from("workflows")
      .select("webhook_url, title, category")
      .eq("id", workflowId)
      .eq("is_active", true)
      .maybeSingle();

    if (workflowError || !workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate webhook URL to prevent SSRF
    if (!isAllowedWebhookUrl(workflow.webhook_url)) {
      return new Response(JSON.stringify({ error: "Webhook URL not permitted" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call the webhook with data as query parameters
    const webhookUrl = new URL(workflow.webhook_url);
    Object.entries(formData || {}).forEach(([key, value]) => {
      webhookUrl.searchParams.append(key, String(value));
    });
    
    // Portfolio Intelligence workflows and AE Portfolio Review expect query params only (empty body)
    // All other workflows get data in both body AND query params for compatibility
    const isQueryParamsOnly = workflow.category === "Portfolio Intelligence" || 
                              workflow.title === "AE Portfolio Review";
    
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: isQueryParamsOnly ? undefined : JSON.stringify(formData || {}),
    });

    // Log the workflow run
    await supabaseAdmin.from("workflow_runs").insert({
      user_id: user.id,
      workflow_id: workflowId,
      workflow_name: workflow.title,
      form_data: formData,
      status: webhookResponse.ok ? "success" : "error",
      error_message: webhookResponse.ok ? null : `HTTP ${webhookResponse.status}`,
    });

    if (!webhookResponse.ok) {
      return new Response(JSON.stringify({ error: "Webhook failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
