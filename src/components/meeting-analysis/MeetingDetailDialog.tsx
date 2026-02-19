import { format, parseISO } from "date-fns";
import { 
  Video, 
  Clock, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Building2,
  Target,
  Lightbulb,
  AlertTriangle,
  ThumbsUp,
  FileText,
  Zap
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
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

interface MeetingDetailDialogProps {
  meeting: AnalyzedMeeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeetingDetailDialog({ meeting, open, onOpenChange }: MeetingDetailDialogProps) {
  if (!meeting) return null;

  const getSentimentConfig = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return {
          icon: TrendingUp,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          label: "Positive",
          description: "Meeting had a constructive and optimistic tone"
        };
      case "negative":
        return {
          icon: TrendingDown,
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          label: "Negative",
          description: "Meeting had concerns or challenges discussed"
        };
      default:
        return {
          icon: Minus,
          color: "text-muted-foreground",
          bg: "bg-muted/50",
          border: "border-border",
          label: "Neutral",
          description: "Meeting had a balanced, informational tone"
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-gradient-to-r from-rose-500/20 to-red-500/10",
          text: "text-rose-400",
          border: "border-rose-500/30",
          dot: "bg-gradient-to-r from-rose-500 to-red-500",
          icon: AlertTriangle
        };
      case "medium":
        return {
          bg: "bg-gradient-to-r from-amber-500/20 to-orange-500/10",
          text: "text-amber-400",
          border: "border-amber-500/30",
          dot: "bg-gradient-to-r from-amber-500 to-orange-500",
          icon: Zap
        };
      case "low":
        return {
          bg: "bg-gradient-to-r from-emerald-500/20 to-teal-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/30",
          dot: "bg-gradient-to-r from-emerald-500 to-teal-500",
          icon: ThumbsUp
        };
      default:
        return {
          bg: "bg-muted",
          text: "text-muted-foreground",
          border: "border-border",
          dot: "bg-muted-foreground",
          icon: CheckCircle2
        };
    }
  };

  const sentimentConfig = getSentimentConfig(meeting.sentiment);
  const SentimentIcon = sentimentConfig.icon;

  const internalAttendees = meeting.attendees.filter(
    a => !meeting.externalAttendees.includes(a)
  );

  // Extract potential account/company from title or external attendees
  const extractCompany = () => {
    // Try to extract company from title (common patterns: "Company | Meeting" or "Company - Meeting")
    const titleMatch = meeting.title.match(/^([^|/\\-]+?)(?:\s*[|/\\-])/);
    if (titleMatch) return titleMatch[1].trim();
    
    // Try to extract from external attendee email domains
    if (meeting.externalAttendees.length > 0) {
      const firstExternal = meeting.externalAttendees[0];
      if (firstExternal.includes('@')) {
        const domain = firstExternal.split('@')[1]?.split('.')[0];
        if (domain && domain.length > 2) {
          return domain.charAt(0).toUpperCase() + domain.slice(1);
        }
      }
    }
    return null;
  };

  const companyName = extractCompany();

  // Calculate meeting insights
  const highPriorityCount = meeting.actionItems.filter(a => a.priority === "high").length;
  const hasDeadlines = meeting.actionItems.some(a => a.dueDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl">
        {/* Header with gradient */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          <div className="relative px-8 py-6">
            <DialogHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                    <Video className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-page-title leading-tight pr-8 break-words">
                      {meeting.title}
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{format(parseISO(meeting.startTime), "EEEE, MMM d, yyyy")}</span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {format(parseISO(meeting.startTime), "HH:mm")} - {format(parseISO(meeting.endTime), "HH:mm")}
                        </span>
                      </div>
                      {companyName && (
                        <>
                          <span className="text-border">•</span>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="font-medium text-foreground">{companyName}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "gap-1.5 py-1.5 px-3 font-medium",
                    sentimentConfig.bg,
                    sentimentConfig.border,
                    sentimentConfig.color
                  )}
                >
                  <SentimentIcon className="h-3.5 w-3.5" />
                  {sentimentConfig.label}
                </Badge>
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <Clock className="h-3.5 w-3.5" />
                  {meeting.duration} min
                </Badge>
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <Users className="h-3.5 w-3.5" />
                  {meeting.attendees.length} attendees
                </Badge>
                {meeting.externalAttendees.length > 0 && (
                  <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-primary/5 border-primary/20">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    {meeting.externalAttendees.length} external
                  </Badge>
                )}
                {meeting.actionItems.length > 0 && (
                  <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {meeting.actionItems.length} action{meeting.actionItems.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </DialogHeader>
          </div>
        </div>

        <Separator />

        {/* Content */}
        <ScrollArea className="max-h-[65vh]">
          <div className="p-8 space-y-8">
            
            {/* Quick Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Sentiment Card */}
              <Card className={cn("border", sentimentConfig.border, sentimentConfig.bg)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", sentimentConfig.bg)}>
                      <SentimentIcon className={cn("h-5 w-5", sentimentConfig.color)} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Sentiment</p>
                      <p className={cn("font-bold", sentimentConfig.color)}>{sentimentConfig.label}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{sentimentConfig.description}</p>
                </CardContent>
              </Card>

              {/* Engagement Card */}
              <Card className="border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Engagement</p>
                      <p className="font-bold text-cyan-400">
                        {meeting.externalAttendees.length > 0 ? 'Customer Meeting' : 'Internal Meeting'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {meeting.externalAttendees.length} external, {internalAttendees.length} internal participants
                  </p>
                </CardContent>
              </Card>

              {/* Priority Card */}
              <Card className={cn(
                "border",
                highPriorityCount > 0 
                  ? "border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-red-500/5"
                  : "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      highPriorityCount > 0 ? "bg-rose-500/20" : "bg-emerald-500/20"
                    )}>
                      <Target className={cn("h-5 w-5", highPriorityCount > 0 ? "text-rose-400" : "text-emerald-400")} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Priority</p>
                      <p className={cn("font-bold", highPriorityCount > 0 ? "text-rose-400" : "text-emerald-400")}>
                        {highPriorityCount > 0 ? `${highPriorityCount} High Priority` : 'On Track'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {hasDeadlines ? 'Action items have assigned deadlines' : 'No urgent deadlines identified'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI Summary */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/20 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-section-title">AI Summary</h3>
                  <p className="text-xs text-muted-foreground">Key takeaways from this meeting</p>
                </div>
              </div>
              <div className="pl-[52px] space-y-3">
                <Card className="bg-gradient-to-r from-violet-500/5 to-purple-500/5 border-violet-500/20">
                  <CardContent className="p-5">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {meeting.summary}
                    </p>
                  </CardContent>
                </Card>
                
                {/* Additional AI Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-violet-500/10 bg-violet-500/5">
                    <p className="text-xs font-semibold text-violet-400 mb-1">Meeting Type</p>
                    <p className="text-sm text-muted-foreground">
                      {meeting.externalAttendees.length > 0 
                        ? `Customer engagement with ${meeting.externalAttendees.length} external participant${meeting.externalAttendees.length > 1 ? 's' : ''}`
                        : `Internal team sync with ${internalAttendees.length} team member${internalAttendees.length > 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-violet-500/10 bg-violet-500/5">
                    <p className="text-xs font-semibold text-violet-400 mb-1">Follow-up Required</p>
                    <p className="text-sm text-muted-foreground">
                      {meeting.actionItems.length > 0
                        ? `${meeting.actionItems.length} action item${meeting.actionItems.length > 1 ? 's' : ''} identified${highPriorityCount > 0 ? `, ${highPriorityCount} high priority` : ''}`
                        : 'No specific follow-ups required'
                      }
                    </p>
                  </div>
                </div>

                {/* Key Decisions */}
                {meeting.keyDecisions && meeting.keyDecisions.length > 0 && (
                  <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Decisions Made</p>
                    </div>
                    <ul className="space-y-1.5">
                      {meeting.keyDecisions.map((d, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-emerald-400 mt-1">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks & Blockers */}
                {meeting.risks && meeting.risks.length > 0 && (
                  <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Risks & Blockers</p>
                    </div>
                    <ul className="space-y-1.5">
                      {meeting.risks.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-amber-400 mt-1">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Meeting Suggestion */}
                {meeting.nextMeetingSuggestion && (
                  <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Suggested Next Steps</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{meeting.nextMeetingSuggestion}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Key Topics */}
            {meeting.keyTopics.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/20 flex items-center justify-center shadow-sm">
                    <MessageSquare className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-section-title">Key Topics Discussed</h3>
                    <p className="text-xs text-muted-foreground">{meeting.keyTopics.length} main discussion points</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-[52px]">
                  {meeting.keyTopics.map((topic, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary"
                      className="bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border border-cyan-500/20 hover:from-cyan-500/20 hover:to-blue-500/15 transition-all px-4 py-1.5 text-sm"
                    >
                      <Lightbulb className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
                      {topic}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Action Items */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-green-500/20 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-section-title">Action Items</h3>
                  <p className="text-xs text-muted-foreground">Tasks and follow-ups from this meeting</p>
                </div>
                {meeting.actionItems.length > 0 && (
                  <Badge variant="secondary" className="px-3 py-1 text-sm">
                    {meeting.actionItems.length} item{meeting.actionItems.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="space-y-3 pl-[52px]">
                {meeting.actionItems.length > 0 ? (
                  meeting.actionItems.map((item, i) => {
                    const priorityConfig = getPriorityConfig(item.priority);
                    const PriorityIcon = priorityConfig.icon;
                    return (
                      <Card 
                        key={i}
                        className={cn(
                          "transition-all duration-200 hover:shadow-md border",
                          priorityConfig.border,
                          priorityConfig.bg
                        )}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", priorityConfig.bg)}>
                              <PriorityIcon className={cn("h-5 w-5", priorityConfig.text)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-relaxed mb-2">{item.task}</p>
                              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                This task requires attention and should be completed to ensure meeting objectives are met.
                              </p>
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs capitalize px-3 py-1 font-semibold border",
                                    priorityConfig.border,
                                    priorityConfig.text
                                  )}
                                >
                                  {item.priority} priority
                                </Badge>
                                <div className="flex items-center gap-1.5 text-sm bg-muted/30 px-2.5 py-1 rounded-md">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium">{item.owner}</span>
                                </div>
                                {item.dueDate && (
                                  <div className="flex items-center gap-1.5 text-sm bg-primary/10 px-2.5 py-1 rounded-md text-primary">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span className="font-medium">{item.dueDate}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="bg-gradient-to-r from-muted/30 to-muted/10 border-border">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">No action items identified</p>
                        <p className="text-xs text-muted-foreground">This meeting did not result in specific follow-up tasks</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

            {/* Attendees */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/20 flex items-center justify-center shadow-sm">
                  <Users className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-section-title">Meeting Participants</h3>
                  <p className="text-xs text-muted-foreground">{meeting.attendees.length} total attendees</p>
                </div>
              </div>
              <div className="pl-[52px] grid grid-cols-1 md:grid-cols-2 gap-4">
                {meeting.externalAttendees.length > 0 && (
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/0 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4 text-primary" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          External ({meeting.externalAttendees.length})
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {meeting.externalAttendees.map((attendee, i) => (
                          <Badge 
                            key={i} 
                            variant="outline"
                            className="bg-primary/10 border-primary/30 text-foreground px-3 py-1 text-sm"
                          >
                            {attendee}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {internalAttendees.length > 0 && (
                  <Card className="bg-gradient-to-br from-secondary/50 to-secondary/20 border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Internal ({internalAttendees.length})
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {internalAttendees.map((attendee, i) => (
                          <Badge key={i} variant="secondary" className="px-3 py-1 text-sm">
                            {attendee}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
