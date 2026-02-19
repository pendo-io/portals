import { useState, useMemo, useEffect, useCallback } from "react";
import WorkflowCard from "@/components/WorkflowCard";
import EmptyState from "@/components/EmptyState";
import CatalogToolbar from "@/components/catalog/CatalogToolbar";
import { AccountPicker } from "@/components/catalog/AccountPicker";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { workflows as hardcodedWorkflows, categories } from "@/data/workflows";
import { Workflow, Role, WorkflowParameter } from "@/types/workflow";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, MessageSquare } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { SFDCAccount } from "@/types/salesforce";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

function getDevUserInfo() {
  const stored = localStorage.getItem("sfdc_dev_session");
  if (!stored) return { email: "", name: "" };
  try {
    const session = JSON.parse(stored);
    return { email: session.email || "", name: session.name || "" };
  } catch {
    return { email: "", name: "" };
  }
}

// Map workflow_type to icon
const getIconForType = (workflowType: string) => {
  switch (workflowType) {
    case 'salesforce-opportunity': return MessageSquare;
    case 'salesforce-account': return MessageSquare;
    default: return Briefcase;
  }
};

// Build parameters based on workflow type and ID
const getParametersForType = (workflowType: string, workflowId?: string): WorkflowParameter[] => {
  const commonParams: WorkflowParameter[] = [
    { name: "clientName", label: "Client Name", type: "text", required: true, placeholder: "e.g. HiBob" },
    { name: "clientWebsite", label: "Client Website", type: "url", required: true, placeholder: "e.g. hibob.com" },
    { name: "yourEmail", label: "Your Email", type: "email", required: true, placeholder: "your.email@pendo.io" },
    { name: "yourName", label: "Your Name", type: "text", required: true, placeholder: "Your full name" }
  ];

  const portfolioReviewIds = [
    'e6b2a1f4-fa1a-46f6-9631-de5a914142cf',
    '5055d3b2-a69e-4673-b97f-3bbfa51c6b3c',
  ];
  if (workflowId && portfolioReviewIds.includes(workflowId)) {
    return [
      { name: "yourEmail", label: "Your Email", type: "email", required: true, placeholder: "your.email@pendo.io" },
      { name: "yourName", label: "Your Name", type: "text", required: true, placeholder: "Your full name" }
    ];
  }

  const sfAccountOnlyIds = [
    'e9180aec-25b6-4ccd-9d53-cec69ec3899c',
    '1379c9ca-6444-4408-964e-1287aa1f55cf',
  ];
  if (workflowId && sfAccountOnlyIds.includes(workflowId)) {
    return [
      { name: "yourEmail", label: "Your Email", type: "email", required: true, placeholder: "your.email@pendo.io" },
      { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true, placeholder: "18-character ID (e.g. 0010a00001bxyG6AAI)" }
    ];
  }

  if (workflowType === 'salesforce-account') {
    return [...commonParams, { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true, placeholder: "e.g. 0014W00002AbCdEFG" }];
  }
  if (workflowType === 'salesforce-opportunity') {
    return [...commonParams, { name: "salesforceOpportunityId", label: "SF Opportunity ID", type: "text", required: true, placeholder: "e.g. 0064W00000AbCdEFG" }];
  }
  return commonParams;
};

const Index = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<SFDCAccount | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('workflows_public').select('*');

    if (error) {
      console.error('Error fetching workflows:', error);
      setWorkflows(hardcodedWorkflows);
      setLoading(false);
      return;
    }

    console.debug('[workflows_public] count:', data?.length, 'titles:', data?.map(d => d.title));

    if (data && data.length > 0) {
      const sorted = [...data].sort((a: any, b: any) => {
        const byCategory = (a.category || '').localeCompare(b.category || '');
        if (byCategory !== 0) return byCategory;
        return (a.title || '').localeCompare(b.title || '');
      });

      const dbWorkflows: Workflow[] = sorted.map((w: any) => ({
        id: w.id || w.original_id || '',
        title: w.title || '',
        category: w.category || '',
        description: w.description || '',
        longDescription: w.long_description || undefined,
        roles: (w.roles || []) as Role[],
        webhook: '',
        samplePayload: {},
        parameters: getParametersForType(w.workflow_type || 'regular', w.id || undefined),
        icon: getIconForType(w.workflow_type || 'regular'),
        stage: w.stage || undefined,
        publicSlug: w.public_slug || undefined,
        isBeta: w.is_beta || false,
      }));
      setWorkflows(dbWorkflows);
    } else {
      setWorkflows(hardcodedWorkflows);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Handle ?open=workflowId — auto-launch if account is already selected
  useEffect(() => {
    const openWorkflowId = searchParams.get('open');
    if (openWorkflowId && workflows.length > 0) {
      const workflowToOpen = workflows.find(w => w.id === openWorkflowId);
      if (workflowToOpen && selectedAccount) {
        handleLaunch(workflowToOpen);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, workflows, selectedAccount]);

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((workflow) => {
      const matchesSearch = searchQuery === "" ||
        workflow.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = activeCategory === "all" || workflow.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [workflows, searchQuery, activeCategory]);

  const handleLaunch = async (workflow: Workflow) => {
    if (!selectedAccount) return;

    setLaunchingId(workflow.id);

    try {
      // Resolve user info
      let userEmail = "";
      let userName = "";

      if (DEV_BYPASS) {
        const devInfo = getDevUserInfo();
        userEmail = devInfo.email;
        userName = devInfo.name;
      } else {
        userEmail = user?.email || "";
        userName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', user!.id)
            .maybeSingle();
          if (profile) {
            userEmail = profile.email || userEmail;
            userName = profile.full_name || userName;
          }
        } catch {
          // fallback to user object values above
        }
      }

      const payload: Record<string, string> = {
        "Client Name": selectedAccount.Name || "",
        "Client Website": selectedAccount.Website || "",
        "Your email ": userEmail,
        "Your Name": userName,
        "Salesforce Account ID": selectedAccount.Id,
      };

      if (DEV_BYPASS) {
        // Dev mode: call webhook directly using hardcoded workflow data
        const hardcoded = hardcodedWorkflows.find(w => w.id === workflow.id);
        if (hardcoded?.webhook) {
          const webhookUrl = new URL(hardcoded.webhook);
          Object.entries(payload).forEach(([k, v]) => webhookUrl.searchParams.set(k, v));
          const res = await fetch(webhookUrl.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(`Workflow returned ${res.status}`);
        } else {
          throw new Error("Webhook not found for this workflow in dev mode");
        }
      } else {
        // Production: use edge function
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: "Authentication Required",
            description: "Please log in to launch workflows.",
            variant: "destructive",
          });
          return;
        }

        const response = await supabase.functions.invoke('trigger-workflow', {
          body: {
            workflowId: workflow.id,
            formData: payload
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'Workflow failed');
        }
      }

      const stats = localStorage.getItem('workflowStats');
      const currentStats = stats ? JSON.parse(stats) : { runs: 152, hoursSaved: 304 };
      const newStats = {
        runs: currentStats.runs + 1,
        hoursSaved: currentStats.hoursSaved + 10
      };
      localStorage.setItem('workflowStats', JSON.stringify(newStats));

      const slackDeliveryWorkflowIds = [
        '1379c9ca-6444-4408-964e-1287aa1f55cf',
        'e9180aec-25b6-4ccd-9d53-cec69ec3899c'
      ];
      if (slackDeliveryWorkflowIds.includes(workflow.id)) {
        toast({
          title: "Workflow Launched Successfully!",
          description: "Results will be delivered to you via Slack within a few seconds to 5-10 minutes.",
          duration: 10000,
        });
      } else {
        toast({
          title: "Workflow Launched Successfully!",
          description: "Results will be delivered within 5-10 minutes.",
          duration: 10000,
        });
      }
    } catch (error) {
      console.error('Workflow error:', error);
      toast({
        title: "Error",
        description: "Failed to start workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLaunchingId(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveCategory("all");
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <AccountPicker
          selected={selectedAccount}
          onSelect={setSelectedAccount}
        />

        <div className="mt-4">
          <CatalogToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            workflowCount={filteredWorkflows.length}
            loading={loading}
            onRefresh={fetchWorkflows}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex justify-end pt-2">
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredWorkflows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onLaunch={handleLaunch}
                disabled={!selectedAccount}
                loading={launchingId === workflow.id}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            searchQuery={searchQuery}
            onClearFilters={clearFilters}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
