import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Map of allowed public workflow slugs to their webhook URLs
const PUBLIC_WORKFLOWS: Record<string, string> = {
  "cx-leader-alignment-brief": "https://pendoio.app.n8n.cloud/webhook/CX_LEADER_ALIGNMENT_BRIEF",
  "customer-360": "https://pendoio.app.n8n.cloud/webhook/87c935f7-9644-470f-af59-f676f4b4b478",
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflowSlug, formData } = await req.json();
    
    if (!workflowSlug || !formData) {
      return new Response(JSON.stringify({ error: "workflowSlug and formData are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email is exactly @pendo.io (endsWith would allow @evil.pendo.io)
    if (formData.yourEmail && !/^[^\s@]+@pendo\.io$/i.test(formData.yourEmail)) {
      return new Response(JSON.stringify({ error: "Please use a @pendo.io email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get webhook URL for this workflow
    const webhookUrl = PUBLIC_WORKFLOWS[workflowSlug];
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build payload with space-based field names matching n8n webhook expectations
    const payload: Record<string, string> = {
      "Your email ": formData.yourEmail || "",
      "Salesforce Account ID": formData.salesforceAccountId || "",
    };

    // Build URL with query params
    const url = new URL(webhookUrl);
    Object.entries(payload).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });

    console.log("Calling webhook with URL:", url.toString());

    // Call the webhook
    const webhookResponse = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      console.error("Webhook failed:", webhookResponse.status, await webhookResponse.text());
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
