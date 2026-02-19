import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { workflows as allWorkflows } from "@/data/workflows";
import type { SFDCAccount } from "@/types/salesforce";

interface AccountWorkflowsTabProps {
  account: SFDCAccount;
}

// Get user info from dev session
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

// Show all account-level workflows (not opportunity-based or portfolio)
const ACCOUNT_WORKFLOWS = allWorkflows.filter(
  (w) =>
    !w.parameters.some((p) => p.name === "salesforceOpportunityId") &&
    w.parameters.some((p) => p.name === "clientName")
);

export function AccountWorkflowsTab({ account }: AccountWorkflowsTabProps) {
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [triggeredMessages, setTriggeredMessages] = useState<Map<string, string>>(new Map());
  const [errorId, setErrorId] = useState<string | null>(null);

  const handleTriggerWorkflow = async (workflowId: string) => {
    const workflow = allWorkflows.find((w) => w.id === workflowId);
    if (!workflow?.webhook) return;

    setTriggeringId(workflowId);
    setErrorId(null);

    const userInfo = getDevUserInfo();

    const payload: Record<string, string> = {
      "Client Name": account.Name || "",
      "Client Website": account.Website || "",
      "Your email ": userInfo.email,
      "Your Name": userInfo.name,
    };

    if (
      account.Id &&
      workflow.parameters.some((p) => p.name === "salesforceAccountId")
    ) {
      payload["Salesforce Account ID"] = account.Id;
    }

    try {
      const webhookUrl = new URL(workflow.webhook);
      Object.entries(payload).forEach(([key, value]) => {
        webhookUrl.searchParams.set(key, value);
      });

      const res = await fetch(webhookUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Workflow returned ${res.status}`);
      }

      let message = "Triggered";
      try {
        const text = await res.text();
        const data = JSON.parse(text);
        if (data.message) message = data.message;
      } catch {
        // response may not be JSON — keep default
      }

      setTriggeredMessages((prev) => new Map(prev).set(workflowId, message));
    } catch (err) {
      console.error("Workflow trigger failed:", err);
      setErrorId(workflowId);
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACCOUNT_WORKFLOWS.map((workflow) => {
          const isTriggering = triggeringId === workflow.id;
          const triggeredMessage = triggeredMessages.get(workflow.id);
          const isTriggered = !!triggeredMessage;
          const isError = errorId === workflow.id;

          return (
            <Card key={workflow.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <workflow.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm">{workflow.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <CardDescription className="flex-1">
                  {workflow.description}
                </CardDescription>
                <Button
                  variant={isTriggered ? "secondary" : "outline"}
                  size="sm"
                  className="mt-3 w-full"
                  disabled={isTriggering || isTriggered}
                  onClick={() => handleTriggerWorkflow(workflow.id)}
                >
                  {isTriggering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Triggering...
                    </>
                  ) : isTriggered ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {triggeredMessage}
                    </>
                  ) : isError ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Retry
                    </>
                  ) : (
                    `Launch for ${account.Name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
