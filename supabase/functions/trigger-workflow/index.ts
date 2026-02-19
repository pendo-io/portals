import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
