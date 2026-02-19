import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Briefcase, Zap, Building2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROLES, Role } from "@/types/workflow";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type WorkflowType = "regular" | "salesforce-account" | "salesforce-opportunity";

const workflowTypeInfo = {
  regular: {
    title: "Regular Workflow",
    description: "Basic workflow with client name, website, and contact info",
    icon: Briefcase,
  },
  "salesforce-account": {
    title: "Salesforce Account Workflow",
    description: "Includes Salesforce Account ID for CRM integration",
    icon: Building2,
  },
  "salesforce-opportunity": {
    title: "Salesforce Opportunity Workflow",
    description: "Includes Salesforce Opportunity ID for deal tracking",
    icon: Zap,
  },
};

const CATEGORIES = [
  "AI-Powered Research & Strategy Briefs",
  "AI Audio Research & Briefings",
  "Call/Transcript-Based Intelligence",
  "Evaluations Assistant AI (opp based)",
  "Portfolio Intelligence",
];

const CreateWorkflow = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [workflowType, setWorkflowType] = useState<WorkflowType | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    longDescription: "",
    category: "",
    webhook: "",
    stage: "Research",
    roles: [] as Role[],
    publishStatus: "staging" as "staging" | "production",
  });

  // Check if user is super admin - always fetch from database for security
  useEffect(() => {
    if (!user) return;
    
    const checkSuperAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      setIsSuperAdmin(!!data);
    };
    checkSuperAdmin();
  }, [user?.id]);

  // Redirect if confirmed not super admin (only after we've actually checked)
  useEffect(() => {
    // Only redirect if we've done the check and user is confirmed not admin
    if (isSuperAdmin === false && user !== undefined) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/workflows");
    }
  }, [isSuperAdmin, user, navigate, toast]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleToggle = (role: Role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  // Validate webhook URL format
  const isValidWebhookUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workflowType) {
      toast({
        title: "Please select a workflow type",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.webhook.trim() || !formData.category.trim() || formData.roles.length === 0) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate webhook URL
    if (!isValidWebhookUrl(formData.webhook.trim())) {
      toast({
        title: "Invalid Webhook URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a workflow.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('workflows').insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        long_description: formData.longDescription.trim() || null,
        category: formData.category.trim(),
        webhook_url: formData.webhook.trim(),
        stage: formData.stage,
        roles: formData.roles,
        workflow_type: workflowType,
        created_by: user.id,
        publish_status: formData.publishStatus,
      });

      if (error) {
        console.error('Error creating workflow:', error);
        toast({
          title: "Error Creating Workflow",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Workflow Created!",
        description: `"${formData.title}" has been saved successfully.`,
      });

      navigate("/workflows");
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking permissions
  if (isSuperAdmin === null) {
    return (
      <div className="flex-1 bg-background">
        <main className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  // Don't render if not super admin (redirect will happen)
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="flex-1 bg-background">
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/workflows")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workflows
        </Button>

        <div className="space-y-8">
          <div>
            <h1 className="text-page-title text-foreground">Create New Workflow</h1>
            <p className="text-muted-foreground mt-2">
              Set up a new automated workflow for your GTM operations
            </p>
          </div>

          {/* Workflow Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select Workflow Type</CardTitle>
              <CardDescription>
                Choose the type of workflow based on your integration needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {(Object.entries(workflowTypeInfo) as [WorkflowType, typeof workflowTypeInfo.regular][]).map(([type, info]) => {
                  const Icon = info.icon;
                  const isSelected = workflowType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWorkflowType(type)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className={`h-8 w-8 mb-3 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <h3 className="font-semibold text-foreground">{info.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Details Form */}
          {workflowType && (
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>2. Workflow Details</CardTitle>
                  <CardDescription>
                    Fill in the workflow information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g. Account Research"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description *</Label>
                    <Input
                      id="description"
                      placeholder="Brief description of what this workflow does"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="longDescription">Long Description</Label>
                    <Textarea
                      id="longDescription"
                      placeholder="Detailed description of the workflow..."
                      value={formData.longDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, longDescription: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhook">Webhook URL *</Label>
                      <Input
                        id="webhook"
                        type="url"
                        placeholder="https://your-n8n-instance.com/webhook/..."
                        value={formData.webhook}
                        onChange={(e) => setFormData(prev => ({ ...prev, webhook: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stage">Stage</Label>
                      <Select 
                        value={formData.stage} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Research">Research</SelectItem>
                          <SelectItem value="Discovery">Discovery</SelectItem>
                          <SelectItem value="Proposal">Proposal</SelectItem>
                          <SelectItem value="Closing">Closing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publishStatus">Publish Status *</Label>
                    <Select 
                      value={formData.publishStatus} 
                      onValueChange={(value: "staging" | "production") => setFormData(prev => ({ ...prev, publishStatus: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staging">Staging (Super Admins Only)</SelectItem>
                        <SelectItem value="production">Production (All Users)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Staging workflows are only visible to super admins
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Roles *</Label>
                    <p className="text-sm text-muted-foreground">Select which roles can use this workflow</p>
                    <div className="flex flex-wrap gap-4">
                      {ROLES.map((role) => (
                        <div key={role} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role}`}
                            checked={formData.roles.includes(role)}
                            onCheckedChange={() => handleRoleToggle(role)}
                          />
                          <Label htmlFor={`role-${role}`} className="cursor-pointer">
                            {role}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Show additional fields based on workflow type */}
                  {workflowType !== "regular" && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {workflowType === "salesforce-account" && (
                          <>This workflow will require users to provide a <strong>Salesforce Account ID</strong> when running it.</>
                        )}
                        {workflowType === "salesforce-opportunity" && (
                          <>This workflow will require users to provide a <strong>Salesforce Opportunity ID</strong> when running it.</>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Workflow"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate("/workflows")} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateWorkflow;