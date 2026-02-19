import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Video,
  Users,
  Mail,
  Copy,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActionItem {
  task: string;
  owner: string;
  priority: "high" | "medium" | "low";
  dueDate?: string;
}

interface AnalyzedMeeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  attendees: string[];
  externalAttendees: string[];
  summary: string;
  actionItems: ActionItem[];
  keyTopics: string[];
  sentiment: "positive" | "neutral" | "negative";
  salesforceAccountId?: string;
  keyDecisions?: string[];
  risks?: string[];
  nextMeetingSuggestion?: string;
}

interface MeetingBreakdownViewProps {
  meetings: AnalyzedMeeting[];
  userName: string;
}

function generateFollowUpEmail(meeting: AnalyzedMeeting, userName: string): { subject: string; body: string } {
  const attendeeNames = meeting.attendees.filter(a => a !== userName);
  const firstName = attendeeNames.length > 0 ? attendeeNames[0].split(" ")[0] : "";

  const subject = `Follow-up: ${meeting.title}`;

  let body = `Hi${firstName ? ` ${firstName}` : ""},\n\n`;
  body += `Hope you're doing well. Following up on our last meeting, here's a quick recap of what we covered and the next steps.\n\n`;
  body += `${meeting.summary}\n`;

  if (meeting.keyTopics.length > 0) {
    body += `\nTopics we covered:\n`;
    meeting.keyTopics.forEach(t => { body += `- ${t}\n`; });
  }

  if (meeting.actionItems.length > 0) {
    body += `\nAction items:\n`;
    meeting.actionItems.forEach(item => {
      body += `- ${item.task} (${item.owner})`;
      if (item.dueDate) body += ` — due ${item.dueDate}`;
      body += "\n";
    });
  }

  if (meeting.keyDecisions && meeting.keyDecisions.length > 0) {
    body += `\nDecisions made:\n`;
    meeting.keyDecisions.forEach(d => { body += `- ${d}\n`; });
  }

  if (meeting.nextMeetingSuggestion) {
    body += `\nNext steps: ${meeting.nextMeetingSuggestion}\n`;
  }

  body += `\nPlease let me know if I missed anything.\n\nBest,\n${userName || "Team"}`;

  return { subject, body };
}

function generateSlackSummary(meeting: AnalyzedMeeting): string {
  const sentimentEmoji = meeting.sentiment === "positive" ? "🟢" : meeting.sentiment === "negative" ? "🔴" : "🟡";
  const date = format(parseISO(meeting.startTime), "MMM d, h:mm a");

  let summary = `${sentimentEmoji} *${meeting.title}*\n`;
  summary += `📅 ${date} • ⏱️ ${meeting.duration} min • 👥 ${meeting.attendees.length} attendees\n\n`;
  summary += `> ${meeting.summary}\n\n`;

  if (meeting.keyTopics.length > 0) {
    summary += `*Topics:* ${meeting.keyTopics.join(", ")}\n`;
  }

  if (meeting.actionItems.length > 0) {
    summary += `\n*Open Items (${meeting.actionItems.length}):*\n`;
    meeting.actionItems.forEach(item => {
      const priorityEmoji = item.priority === "high" ? "🔴" : item.priority === "medium" ? "🟡" : "🟢";
      summary += `${priorityEmoji} ${item.task} → ${item.owner}`;
      if (item.dueDate) summary += ` (due ${item.dueDate})`;
      summary += "\n";
    });
  }

  return summary;
}

const getSentimentConfig = (sentiment: string) => {
  switch (sentiment) {
    case "positive": return { icon: TrendingUp, badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Positive" };
    case "negative": return { icon: TrendingDown, badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400", label: "Negative" };
    default: return { icon: Minus, badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", label: "Neutral" };
  }
};

export function MeetingBreakdownView({ meetings, userName }: MeetingBreakdownViewProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailContent, setEmailContent] = useState<{ subject: string; body: string } | null>(null);

  const handleDraftEmail = (meeting: AnalyzedMeeting) => {
    const email = generateFollowUpEmail(meeting, userName);
    setEmailContent(email);
    setEmailDialogOpen(true);
  };

  const handleCopyEmail = () => {
    if (!emailContent) return;
    const fullEmail = `Subject: ${emailContent.subject}\n\n${emailContent.body}`;
    navigator.clipboard.writeText(fullEmail);
    toast.success("Email copied to clipboard", { position: "top-center" });
  };

  const handleCopySummary = (meeting: AnalyzedMeeting) => {
    const summary = generateSlackSummary(meeting);
    navigator.clipboard.writeText(summary);
    toast.success("Summary copied — ready for Slack or Salesforce", { position: "top-center" });
  };

  if (meetings.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No meetings this week
      </div>
    );
  }

  const sortedMeetings = [...meetings].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <>
      <div className="space-y-3">
        {sortedMeetings.map((meeting) => {
          const sentimentConfig = getSentimentConfig(meeting.sentiment);
          const SentimentIcon = sentimentConfig.icon;
          const externalCount = meeting.externalAttendees.length;

          return (
            <Card key={meeting.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Video className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-tight truncate">{meeting.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{format(parseISO(meeting.startTime), "EEE, MMM d • h:mm a")}</span>
                          <span className="text-border">•</span>
                          <span>{meeting.duration} min</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3 pl-[44px]">
                      {meeting.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pl-[44px]">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium gap-1", sentimentConfig.badge)}>
                        <SentimentIcon className="h-3 w-3" />
                        {sentimentConfig.label}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium gap-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <Users className="h-3 w-3" />
                        {meeting.attendees.length}
                      </span>
                      {externalCount > 0 && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          <Building2 className="h-3 w-3" />
                          {externalCount} external
                        </span>
                      )}
                      {meeting.actionItems.length > 0 && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {meeting.actionItems.length} actions
                        </span>
                      )}
                      {meeting.actionItems.some(a => a.priority === "high") && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium gap-1 bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                          <AlertCircle className="h-3 w-3" />
                          High priority
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleDraftEmail(meeting)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Draft Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleCopySummary(meeting)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Summary
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Follow-up Email Draft
            </DialogTitle>
          </DialogHeader>
          {emailContent && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Subject</p>
                  <p className="text-sm font-medium">{emailContent.subject}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                    {emailContent.body}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleCopyEmail} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
