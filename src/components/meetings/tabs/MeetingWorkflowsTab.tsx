import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { workflows as allWorkflows } from "@/data/workflows";
import type { MomentumMeeting } from "@/types/meeting";

interface MeetingWorkflowsTabProps {
  meeting: MomentumMeeting;
}

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

// Meeting/transcript-based workflow IDs
const MEETING_WORKFLOW_IDS = [
  "transcript-value-hypothesis",
  "client-relationship-intelligence",
  "joint-value-plan",
  "last-meeting-snapshot",
  "strategic-evaluation-3-whys",
  "roi-generator",
];

const MEETING_WORKFLOWS = allWorkflows.filter((w) =>
  MEETING_WORKFLOW_IDS.includes(w.id)
);

export function MeetingWorkflowsTab({ meeting }: MeetingWorkflowsTabProps) {
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [triggeredIds, setTriggeredIds] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<string | null>(null);

  const handleTriggerWorkflow = async (workflowId: string) => {
    const workflow = allWorkflows.find((w) => w.id === workflowId);
    if (!workflow?.webhook) return;

    setTriggeringId(workflowId);
    setErrorId(null);

    const userInfo = getDevUserInfo();

    // Derive client name from external attendees' email domain
    const externalAttendee = meeting.attendees?.find((a) => !a.isInternal);
    const clientName =
      externalAttendee?.email?.split("@")[1]?.split(".")[0] || meeting.title || "";

    const payload: Record<string, string> = {
      "Client Name": clientName,
      "Client Website": externalAttendee?.email?.split("@")[1] || "",
      "Your email ": userInfo.email,
      "Your Name": userInfo.name,
    };

    if (meeting.salesforceAccountId) {
      payload["Salesforce Account ID"] = meeting.salesforceAccountId;
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

      setTriggeredIds((prev) => new Set(prev).add(workflowId));
    } catch (err) {
      console.error("Workflow trigger failed:", err);
      setErrorId(workflowId);
    } finally {
      setTriggeringId(null);
    }
  };

  // Group by category
  const grouped = MEETING_WORKFLOWS.reduce(
    (acc, w) => {
      const cat = w.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(w);
      return acc;
    },
    {} as Record<string, typeof MEETING_WORKFLOWS>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-section-title">Meeting Workflows</h3>
        <p className="text-sm text-muted-foreground">
          Trigger transcript-based workflows for this meeting — your info and meeting
          data are auto-filled
        </p>
      </div>

      {Object.entries(grouped).map(([category, workflows]) => (
        <div key={category} className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {category}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((workflow) => {
              const isTriggering = triggeringId === workflow.id;
              const isTriggered = triggeredIds.has(workflow.id);
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
                          Triggered
                        </>
                      ) : isError ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Retry
                        </>
                      ) : (
                        "Launch"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
