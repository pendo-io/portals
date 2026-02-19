import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import WorkflowForm from "@/components/WorkflowForm";
import { workflows as allWorkflows } from "@/data/workflows";
import { Workflow } from "@/types/workflow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Define the engagement stages based on the customer journey
const engagementStages = [
  {
    phase: "Customer Learns",
    phaseColor: "bg-pink-500",
    subtitle: "Pipeline Generation (PG)",
    stages: [
      { id: 0, name: "Customer agrees to further discussions", color: "bg-pink-100 dark:bg-pink-900/30" },
      { id: 1, name: "Customer is open to change & shares info", color: "bg-pink-200 dark:bg-pink-900/50" },
      { id: 2, name: "Customer tells us problems and impacts", color: "bg-pink-300 dark:bg-pink-900/70" }
    ]
  },
  {
    phase: "Customer Engages",
    phaseColor: "bg-purple-500",
    subtitle: "Visible Opportunity (VO)",
    stages: [
      { id: 3, name: "Customer tells us benefits of our solution", color: "bg-purple-200 dark:bg-purple-900/50" },
      { id: 4, name: "Customer provides access to procurement & legal", color: "bg-purple-300 dark:bg-purple-900/70" }
    ]
  },
  {
    phase: "Customer Receives Value",
    phaseColor: "bg-orange-500",
    subtitle: "Value Realization",
    stages: [
      { id: 5, name: "Customer is ready to move forward & purchase", color: "bg-orange-200 dark:bg-orange-900/50" },
      { id: 6, name: "Customer actively uses the service & sees value", color: "bg-orange-300 dark:bg-orange-900/70" }
    ]
  }
];

const CustomerEngagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Group workflows by stage
  const workflowsByStage = useMemo(() => {
    const grouped: Record<number, Workflow[]> = {};
    
    // For now, all workflows are in "Research" stage, so we'll distribute them across stages
    // In a real implementation, workflows would have stage numbers (0-6)
    allWorkflows.forEach((workflow, index) => {
      const stageNum = index % 7; // Distribute across 7 stages
      if (!grouped[stageNum]) {
        grouped[stageNum] = [];
      }
      grouped[stageNum].push(workflow);
    });
    
    return grouped;
  }, []);

  const handleWorkflowLaunch = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (workflow: Workflow, formData: Record<string, string>) => {
    setIsLoading(workflow.id);
    
    try {
      const params: Record<string, string> = {
        "Client Name": formData.clientName || "",
        "Client Website": formData.clientWebsite || "",
        "Your email ": formData.yourEmail || "",
        "Your Name": formData.yourName || ""
      };
      
      if (formData.salesforceAccountId) {
        params["Salesforce Account ID"] = formData.salesforceAccountId;
      }
      
      if (formData.salesforceOpportunityId) {
        params["SF Opportunity ID"] = formData.salesforceOpportunityId;
      }
      
      const queryParams = new URLSearchParams(params).toString();
      const webhookUrl = `${workflow.webhook}?${queryParams}`;
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Save workflow run to database with success status
        if (user) {
          await supabase.from('workflow_runs').insert({
            user_id: user.id,
            workflow_id: workflow.id,
            workflow_name: workflow.title,
            form_data: formData,
            status: 'success'
          });
        }

        // Update stats in localStorage
        const stats = JSON.parse(localStorage.getItem('workflowStats') || '{}');
        stats[workflow.id] = (stats[workflow.id] || 0) + 1;
        localStorage.setItem('workflowStats', JSON.stringify(stats));

        toast({
          title: "Workflow Started! 🚀",
          description: `${workflow.title} is now running. You'll receive the results via email shortly.`,
        });
        
        setIsFormOpen(false);
        setSelectedWorkflow(null);
      } else {
        // Save workflow run to database with failure status
        if (user) {
          await supabase.from('workflow_runs').insert({
            user_id: user.id,
            workflow_id: workflow.id,
            workflow_name: workflow.title,
            form_data: formData,
            status: 'failure',
            error_message: `HTTP ${response.status}: ${response.statusText}`
          });
        }
        throw new Error('Workflow submission failed');
      }
    } catch (error) {
      // Save failure if not already saved
      if (user && error instanceof Error && error.message !== 'Workflow submission failed') {
        await supabase.from('workflow_runs').insert({
          user_id: user.id,
          workflow_id: workflow.id,
          workflow_name: workflow.title,
          form_data: formData,
          status: 'failure',
          error_message: error.message
        });
      }
      console.error('Error launching workflow:', error);
      toast({
        title: "Error",
        description: "Failed to start workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-background to-muted/20">
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/workflows")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflows
          </Button>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Customer Engagement Process</h1>
            <p className="text-lg text-muted-foreground">
              AI-powered workflows organized by customer journey stage
            </p>
          </div>
        </div>

        {/* Journey Phases */}
        <div className="space-y-12">
          {engagementStages.map((phase) => (
            <div key={phase.phase} className="space-y-6">
              {/* Phase Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-20 rounded-full ${phase.phaseColor}`} />
                  <h2 className="text-page-title">{phase.phase}</h2>
                </div>
                <p className="text-muted-foreground ml-23">{phase.subtitle}</p>
              </div>

              {/* Stages in this Phase */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {phase.stages.map((stage) => {
                  const stageWorkflows = workflowsByStage[stage.id] || [];
                  
                  return (
                    <Card key={stage.id} className={`border-2 ${stage.color}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <Badge variant="secondary" className="mb-2">
                            Stage {stage.id}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{stage.name}</CardTitle>
                        <CardDescription>
                          {stageWorkflows.length} workflow{stageWorkflows.length !== 1 ? 's' : ''} available
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {stageWorkflows.length > 0 ? (
                          stageWorkflows.map((workflow) => (
                            <div
                              key={workflow.id}
                              className="flex items-start justify-between gap-3 rounded-lg border p-3 bg-background/50 hover:bg-background transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{workflow.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {workflow.description}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleWorkflowLaunch(workflow)}
                                disabled={isLoading === workflow.id}
                                className="shrink-0"
                              >
                                <Rocket className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No workflows assigned to this stage yet
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Supporting Roles Section */}
        <div className="mt-12 p-6 border rounded-lg bg-muted/30">
          <h3 className="text-section-title mb-4">Supporting Roles</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Badge className="bg-pink-200 text-pink-900 dark:bg-pink-900 dark:text-pink-100">
                AE / SE
              </Badge>
              <p className="text-sm text-muted-foreground">
                Account Executives and Sales Engineers guide customers through stages 0-4
              </p>
            </div>
            <div className="space-y-2">
              <Badge className="bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-100">
                Value Consultant
              </Badge>
              <p className="text-sm text-muted-foreground">
                Value Consultants support BVA/Workshops and customer success in stages 3-6
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Workflow Form Modal */}
      {selectedWorkflow && (
        <WorkflowForm
          workflow={selectedWorkflow}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedWorkflow(null);
          }}
          onSubmit={handleFormSubmit}
          isLoading={isLoading === selectedWorkflow.id}
        />
      )}
    </div>
  );
};

export default CustomerEngagement;
