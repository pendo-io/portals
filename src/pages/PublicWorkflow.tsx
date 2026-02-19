import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, Sparkles } from "lucide-react";
import pendoLogo from "@/assets/pendo-logo.png";
import { supabase } from "@/integrations/supabase/client";

const WORKFLOW_CONFIG = {
  "cx-leader-alignment-brief": {
    id: "1379c9ca-6444-4408-964e-1287aa1f55cf",
    title: "CX Leader Alignment Brief",
    description: "Prepares CX Leaders for Strategic Alignment Calls with comprehensive customer context and digital maturity analysis.",
    longDescription: "Generates a one-page executive brief for CX Leaders to understand customer context, identify blockers, and surface learning signals for AI/automation use cases. Includes situation snapshot, stakeholder dynamics, customer quotes, and recommended executive approach.",
    webhookUrl: "https://pendoio.app.n8n.cloud/webhook/CX_LEADER_ALIGNMENT_BRIEF",
    parameters: [
      { name: "yourEmail", label: "Your Email", type: "email", required: true },
      { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true },
    ]
  },
  "customer-360": {
    id: "e9180aec-25b6-4ccd-9d53-cec69ec3899c",
    title: "Customer 360",
    description: "Comprehensive customer health and engagement analysis combining Pendo product usage with Salesforce data.",
    longDescription: "Analyzes Pendo product usage analytics alongside Salesforce data to provide a complete view of customer health, engagement patterns, and strategic opportunities. Results are delivered via Slack.",
    webhookUrl: "https://pendoio.app.n8n.cloud/webhook/87c935f7-9644-470f-af59-f676f4b4b478",
    parameters: [
      { name: "yourEmail", label: "Your Email", type: "email", required: true },
      { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true },
    ]
  }
};

export default function PublicWorkflow() {
  const [searchParams] = useSearchParams();
  const workflowSlug = searchParams.get("workflow") || "cx-leader-alignment-brief";
  
  const workflow = WORKFLOW_CONFIG[workflowSlug as keyof typeof WORKFLOW_CONFIG];
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Workflow Not Found</CardTitle>
            <CardDescription>The requested workflow does not exist or is no longer available.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const missingFields = workflow.parameters
      .filter(p => p.required && !formData[p.name]?.trim())
      .map(p => p.label);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(", ")}`);
      return;
    }

    // Validate email format
    if (formData.yourEmail && !formData.yourEmail.endsWith("@pendo.io")) {
      toast.error("Please use a @pendo.io email address");
      return;
    }

    setIsLoading(true);

    try {
      // Use edge function to proxy the webhook call (avoids CORS)
      const { data, error } = await supabase.functions.invoke("trigger-public-workflow", {
        body: {
          workflowSlug,
          formData,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to submit workflow");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to submit workflow");
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Workflow submission error:", error);
      toast.error("Failed to submit workflow. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Submitted Successfully!</CardTitle>
            <CardDescription className="text-base">
              Your {workflow.title} request has been submitted. Processing may take up to a few minutes. Results will be delivered to you via Slack.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsSuccess(false);
                setFormData({});
              }}
            >
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-primary/20 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <img src={pendoLogo} alt="Pendo" className="h-8" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl">{workflow.title}</CardTitle>
            </div>
            <CardDescription className="text-base">
              {workflow.description}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {workflow.parameters.map((param) => (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>
                  {param.label}
                  {param.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={param.name}
                  type={param.type}
                  placeholder={`Enter ${param.label.toLowerCase()}`}
                  value={formData[param.name] || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, [param.name]: e.target.value }))}
                  required={param.required}
                />
              </div>
            ))}

            <Button 
              type="submit" 
              className="w-full mt-6" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Brief
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {workflow.longDescription}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
