import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMeetings as fetchMeetingsDirect } from "@/services/momentum";
import type { MomentumMeeting } from "@/types/meeting";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  Clock,
  Users,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  List,
  ListTodo,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MeetingDetailDialog } from "@/components/meeting-analysis/MeetingDetailDialog";
import { ActionItemsView } from "@/components/meeting-analysis/ActionItemsView";
import { MeetingBreakdownView } from "@/components/meeting-analysis/MeetingBreakdownView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useImpersonation } from "@/contexts/ImpersonationContext";

interface ActionItem {
  task: string;
  owner: string;
  priority: "high" | "medium" | "low";
  dueDate?: string;
  meetingTitle?: string;
  meetingDate?: string;
  externalAttendees?: string[];
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

interface WeekAnalysis {
  meetings: AnalyzedMeeting[];
  weekSummary: string;
  topPriorities: string[];
  keyCommitments: string[];
  totalActionItems: number;
  actionItemsByPriority: {
    high: ActionItem[];
    medium: ActionItem[];
    low: ActionItem[];
  };
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

function toAnalyzedMeeting(m: MomentumMeeting): AnalyzedMeeting {
  const start = new Date(m.startTime);
  const end = new Date(m.endTime);
  const externalAttendees = m.attendees?.filter(a => !a.isInternal).map(a => a.email || a.name) || [];
  return {
    id: m.id,
    title: m.title,
    date: start.toISOString().split("T")[0],
    startTime: m.startTime,
    endTime: m.endTime,
    duration: Math.round((end.getTime() - start.getTime()) / 60000),
    attendees: m.attendees?.map(a => a.name) || [],
    externalAttendees,
    summary: m.summary || `Meeting: ${m.title}`,
    actionItems: m.actionItems?.map(a => ({
      task: a.text,
      owner: a.assignee || "Unassigned",
      priority: (a.priority as "high" | "medium" | "low") || "medium",
    })) || [],
    keyTopics: m.keyTopics || [],
    sentiment: (m.sentiment as "positive" | "neutral" | "negative") || "neutral",
    salesforceAccountId: m.salesforceAccountId,
    keyDecisions: m.decisions || [],
    risks: m.risks || [],
  };
}

function MeetingAnalysisLoader() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading meetings...</p>
      </div>
    </div>
  );
}

export function MeetingAnalysisContent() {
  const { user } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [analysis, setAnalysis] = useState<WeekAnalysis | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<AnalyzedMeeting | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "calendar" | "actions" | "meetings">("table");
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  const fetchIdRef = useRef(0);

  // Check access and load team members
  useEffect(() => {
    const initialize = async () => {
      console.log("[meetings] initialize called", { user: user?.id, email: user?.email, isImpersonating, impersonatedUser: impersonatedUser?.email });

      // In dev bypass mode, there's no Supabase user — get email from SFDC session
      if (!user) {
        let sfdcEmail = "";
        try {
          const stored = localStorage.getItem("sfdc_dev_session");
          if (stored) sfdcEmail = JSON.parse(stored).email || "";
        } catch { /* ignore */ }

        console.log("[meetings] no supabase user, sfdc email:", sfdcEmail);
        if (sfdcEmail) {
          setSelectedEmail(sfdcEmail);
          setUserName(sfdcEmail);
        }
        setIsLoading(false);
        return;
      }

      // If impersonating, use the impersonated user's email and skip admin check
      if (isImpersonating && impersonatedUser) {
        console.log("[meetings] impersonating, using", impersonatedUser.email);
        setSelectedEmail(impersonatedUser.email);
        setUserName(impersonatedUser.full_name || impersonatedUser.email);
        setIsSuperAdmin(false); // Treat as regular user when impersonating
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      console.log("[meetings] profile fetch", { profile, profileError });

      if (profile?.full_name) {
        setUserName(profile.full_name);
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      console.log("[meetings] role fetch", { roleData, roleError });

      const isAdmin = !!roleData;
      setIsSuperAdmin(isAdmin);
      console.log("[meetings] setting selectedEmail to:", user.email || "");
      setSelectedEmail(user.email || "");

      if (isAdmin) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .not("email", "is", null)
          .order("full_name");

        if (profiles) {
          setTeamMembers(profiles.filter(p => p.email) as TeamMember[]);
        }
      }

      setIsLoading(false);
    };

    initialize();
  }, [user, isImpersonating, impersonatedUser]);

  const fetchAndAnalyzeMeetings = useCallback(async () => {
    if (!selectedEmail) return;

    const fetchId = ++fetchIdRef.current;
    const weekEndDate = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    console.log("[meetings] fetchAndAnalyzeMeetings START", { fetchId, selectedEmail, from: currentWeekStart.toISOString(), to: weekEndDate.toISOString() });

    setIsAnalyzing(true);
    setAnalysis(null);
    setRateLimitError(null);

    try {
      // In dev bypass mode, call the Momentum API directly via the Vite proxy
      // (no Supabase auth available, so the edge function would return 401)
      if (DEV_BYPASS) {
        const rawMeetings = await fetchMeetingsDirect(
          selectedEmail,
          currentWeekStart.toISOString(),
          weekEndDate.toISOString(),
        );

        if (fetchId !== fetchIdRef.current) return;

        if (rawMeetings.length === 0) {
          setAnalysis({
            meetings: [],
            weekSummary: "No meetings found for this week.",
            topPriorities: [],
            keyCommitments: [],
            totalActionItems: 0,
            actionItemsByPriority: { high: [], medium: [], low: [] },
          });
          return;
        }

        const analyzed = rawMeetings.map(toAnalyzedMeeting);
        const allActionItems = analyzed.flatMap(m =>
          m.actionItems.map(a => ({ ...a, meetingTitle: m.title, meetingDate: m.date, externalAttendees: m.externalAttendees }))
        );

        setAnalysis({
          meetings: analyzed,
          weekSummary: "",
          topPriorities: [],
          keyCommitments: [],
          totalActionItems: allActionItems.length,
          actionItemsByPriority: {
            high: allActionItems.filter(a => a.priority === "high"),
            medium: allActionItems.filter(a => a.priority === "medium"),
            low: allActionItems.filter(a => a.priority === "low"),
          },
        });
        return;
      }

      const { data: meetingsData, error: meetingsError } = await supabase.functions.invoke("momentum-data", {
        body: {
          action: "get_meetings",
          attendeeEmail: selectedEmail,
          fromDate: currentWeekStart.toISOString(),
          toDate: weekEndDate.toISOString(),
          pageSize: 50,
        },
      });

      console.log("[meetings] momentum-data response", { fetchId, meetingsData, meetingsError });

      if (fetchId !== fetchIdRef.current) {
        console.log("[meetings] stale fetch discarded", { fetchId, current: fetchIdRef.current });
        return;
      }

      if (meetingsError?.message?.includes("429") || meetingsData?.error?.includes("Rate limit")) {
        const message = meetingsData?.message || "Maximum 20 calls per 60 minutes. Please wait and try again.";
        setRateLimitError(message);
        toast.error("Rate limit exceeded", { description: message, position: "top-center" });
        return;
      }

      if (meetingsError) throw meetingsError;

      if (!meetingsData?.success) {
        if (meetingsData?.error === "Rate limit exceeded") {
          setRateLimitError(meetingsData.message || "Maximum 20 calls per 60 minutes. Please wait and try again.");
          return;
        }
        throw new Error(meetingsData?.error || "Failed to fetch meetings");
      }

      const meetings = meetingsData.data?.meetings || [];

      if (meetings.length === 0) {
        setAnalysis({
          meetings: [],
          weekSummary: "No meetings found for this week.",
          topPriorities: [],
          keyCommitments: [],
          totalActionItems: 0,
          actionItemsByPriority: { high: [], medium: [], low: [] },
        });
        return;
      }

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-meetings", {
        body: { meetings },
      });

      if (fetchId !== fetchIdRef.current) return;

      if (analysisError) throw analysisError;

      if (!analysisData?.success) {
        throw new Error(analysisData?.error || "Failed to analyze meetings");
      }

      setAnalysis(analysisData.analysis);

    } catch (error: any) {
      if (fetchId !== fetchIdRef.current) return;
      console.error("Error:", error);

      if (error.name === "FunctionsHttpError" || error.message?.includes("non-2xx status code")) {
        try {
          const errorBody = error.context?.body || await error.context?.json?.();
          if (errorBody?.error === "Rate limit exceeded" || errorBody?.message?.includes("calls per")) {
            setRateLimitError(errorBody.message || "Maximum 20 calls per 60 minutes. Please wait and try again.");
            toast.error("Rate limit exceeded", { position: "top-center" });
            return;
          }
        } catch {
          // If we can't parse the body, check the general error
        }

        setRateLimitError("Maximum 20 calls per 60 minutes. Please wait and try again.");
        toast.error("Rate limit exceeded", { position: "top-center" });
      } else if (error.message?.includes("Rate limit") || error.message?.includes("429")) {
        setRateLimitError("Maximum 20 calls per 60 minutes. Please wait and try again.");
      } else {
        toast.error(error.message || "Failed to analyze meetings");
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, [selectedEmail, currentWeekStart]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const getMeetingsForDay = (day: Date) => {
    if (!analysis) return [];
    return analysis.meetings.filter(m => isSameDay(parseISO(m.date), day));
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return TrendingUp;
      case "negative": return TrendingDown;
      default: return Minus;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-emerald-400";
      case "negative": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const handleMeetingClick = (meeting: AnalyzedMeeting) => {
    setSelectedMeeting(meeting);
    setDialogOpen(true);
  };

  // Auto-fetch and analyze when email is ready or week changes
  useEffect(() => {
    console.log("[meetings] useEffect fired", { isLoading, selectedEmail, currentWeekStart: currentWeekStart.toISOString() });
    if (!isLoading && selectedEmail) {
      console.log("[meetings] calling fetchAndAnalyzeMeetings");
      fetchAndAnalyzeMeetings();
    } else {
      console.log("[meetings] skipped fetch — isLoading:", isLoading, "selectedEmail:", selectedEmail);
    }
  }, [isLoading, selectedEmail, fetchAndAnalyzeMeetings]);

  const filteredTeamMembers = teamMembers.filter(member =>
    member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* TOOLBAR — matches AccountsToolbar pattern */}
      <div className="border-b px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
        {isSuperAdmin && (
          <Select value={selectedEmail} onValueChange={setSelectedEmail}>
            <SelectTrigger className="w-full sm:w-[220px] h-9">
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2"
                />
              </div>
              {filteredTeamMembers.map((member) => (
                <SelectItem key={member.id} value={member.email}>
                  {member.full_name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="h-9 w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold min-w-[180px] text-center">
          {format(currentWeekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </span>
        <Button variant="outline" size="icon" onClick={goToNextWeek} className="h-9 w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="ml-auto">
          <TabsList className="h-9 bg-muted">
            <TabsTrigger value="table" className="gap-1.5 px-3 data-[state=active]:bg-background">
              <List className="h-3.5 w-3.5" />
              <span className="text-xs">Table</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 px-3 data-[state=active]:bg-background">
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="text-xs">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-1.5 px-3 data-[state=active]:bg-background">
              <ListTodo className="h-3.5 w-3.5" />
              <span className="text-xs">Action Items</span>
              {analysis && analysis.totalActionItems > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {analysis.totalActionItems}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meetings" className="gap-1.5 px-3 data-[state=active]:bg-background">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-xs">Breakdown</span>
              {analysis && analysis.meetings.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {analysis.meetings.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-auto">

        {/* Day Headers - only in calendar view */}
        {viewMode === "calendar" && (
          <div className="px-3 sm:px-6 pt-3">
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day.toISOString()}
                  className="text-center py-2 px-1 bg-muted/30 rounded-lg"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {format(day, "EEE")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOADING */}
        {isAnalyzing ? (
          <MeetingAnalysisLoader />
        ) : (
        <>

        {/* RATE LIMIT ERROR */}
        {rateLimitError && (
          <div className="px-3 sm:px-6 py-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">Rate Limit Reached</h3>
                    <p className="text-sm text-muted-foreground">{rateLimitError}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your access will reset automatically within the hour.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRateLimitError(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === "table" && analysis && analysis.meetings.length > 0 && (
          <div className="w-full overflow-x-auto border-b">
            <Table className="[&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Meeting</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-[100px]">Date</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-[80px]">Time</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-[80px] text-right">Duration</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-[100px] text-right hidden sm:table-cell">Attendees</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-[90px] hidden md:table-cell">Sentiment</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Topics</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-[90px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.meetings
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((meeting) => {
                    const SentimentIcon = getSentimentIcon(meeting.sentiment);
                    const sentimentColor = getSentimentColor(meeting.sentiment);
                    const sentimentLabel = meeting.sentiment.charAt(0).toUpperCase() + meeting.sentiment.slice(1);
                    const highCount = meeting.actionItems.filter(a => a.priority === "high").length;

                    return (
                      <TableRow
                        key={meeting.id}
                        className="cursor-pointer hover:bg-muted/50 h-[52px]"
                        onClick={() => handleMeetingClick(meeting)}
                      >
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
                            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                              <Video className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm leading-tight truncate">{meeting.title}</p>
                              {meeting.externalAttendees.length > 0 && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {meeting.externalAttendees.slice(0, 2).join(", ")}
                                  {meeting.externalAttendees.length > 2 && ` +${meeting.externalAttendees.length - 2}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-sm tabular-nums">{format(parseISO(meeting.date), "MMM d")}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-sm tabular-nums">{format(parseISO(meeting.startTime), "HH:mm")}</span>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <span className="text-sm font-medium tabular-nums">{meeting.duration}m</span>
                        </TableCell>
                        <TableCell className="py-2 text-right hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-sm">{meeting.attendees.length}</span>
                            {meeting.externalAttendees.length > 0 && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                                {meeting.externalAttendees.length} ext
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 hidden md:table-cell">
                          <div className={cn("flex items-center gap-1.5", sentimentColor)}>
                            <SentimentIcon className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">{sentimentLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {meeting.keyTopics.slice(0, 3).map((topic, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {topic.length > 18 ? topic.slice(0, 18) + "…" : topic}
                              </Badge>
                            ))}
                            {meeting.keyTopics.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                                +{meeting.keyTopics.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {meeting.actionItems.length > 0 ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                {meeting.actionItems.length}
                              </span>
                              {highCount > 0 && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                  {highCount} high
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        )}

        {viewMode === "table" && !analysis && !isAnalyzing && !rateLimitError && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            No meetings this week
          </div>
        )}

        {viewMode === "table" && analysis && analysis.meetings.length === 0 && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            No meetings this week
          </div>
        )}

        {/* ACTION ITEMS VIEW */}
        {viewMode === "actions" && analysis && (
          <ActionItemsView
            actionItemsByPriority={analysis.actionItemsByPriority}
            totalActionItems={analysis.totalActionItems}
            userEmail={user?.email}
            userName={userName}
            isSuperAdmin={isSuperAdmin}
          />
        )}

        {viewMode === "actions" && !analysis && !isAnalyzing && !rateLimitError && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            No action items
          </div>
        )}

        {/* MEETINGS BREAKDOWN VIEW */}
        {viewMode === "meetings" && analysis && (
          <MeetingBreakdownView
            meetings={analysis.meetings}
            userName={userName}
          />
        )}

        {viewMode === "meetings" && !analysis && !isAnalyzing && !rateLimitError && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            No meetings this week
          </div>
        )}

        {/* Calendar Grid */}
        {viewMode === "calendar" && (
          <div className="px-3 sm:px-6 py-3">
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => {
                const dayMeetings = getMeetingsForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[200px] border rounded-lg p-2.5 flex flex-col",
                      isToday
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/50 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-semibold mb-2 flex items-center justify-between px-0.5",
                      isToday ? "text-primary" : "text-foreground"
                    )}>
                      <span>{format(day, "d")}</span>
                      {isToday && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                          Today
                        </span>
                      )}
                    </div>

                    {isAnalyzing ? (
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                      </div>
                    ) : (
                      <div className="space-y-2 flex-1 overflow-y-auto">
                        {dayMeetings.map((meeting) => {
                          const SentimentIcon = getSentimentIcon(meeting.sentiment);
                          const sentimentColor = getSentimentColor(meeting.sentiment);

                          return (
                            <button
                              key={meeting.id}
                              onClick={() => handleMeetingClick(meeting)}
                              className="w-full text-left p-2.5 rounded-lg text-xs border border-border/50 hover:bg-muted/50 transition-colors group"
                            >
                              <div className="flex items-start gap-2 mb-1.5">
                                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                  <Video className="h-3 w-3 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-xs leading-tight line-clamp-2 block">{meeting.title}</span>
                                </div>
                                <div className={cn("shrink-0", sentimentColor)}>
                                  <SentimentIcon className="h-3 w-3" />
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pl-7">
                                <span>{format(parseISO(meeting.startTime), "HH:mm")}</span>
                                <span>·</span>
                                <span>{meeting.duration}m</span>
                                {meeting.externalAttendees.length > 0 && (
                                  <>
                                    <span>·</span>
                                    <span>{meeting.externalAttendees.length} ext</span>
                                  </>
                                )}
                              </div>

                              {meeting.actionItems.length > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 pl-7">
                                  <span className="inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    {meeting.actionItems.length} action{meeting.actionItems.length > 1 ? 's' : ''}
                                  </span>
                                  {meeting.actionItems.some(a => a.priority === "high") && (
                                    <span className="inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                      high
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                        {dayMeetings.length === 0 && !isAnalyzing && analysis && (
                          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/40 flex-1 min-h-[80px]">
                            <Calendar className="h-4 w-4 mb-1" />
                            <span className="text-[10px]">No meetings</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {viewMode === "calendar" && !analysis && !isAnalyzing && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            No meetings this week
          </div>
        )}
        </>
        )}
      </div>

      {/* Dev mode notice */}
      {DEV_BYPASS && (
        <div className="border-t border-border/50 px-3 sm:px-6 py-2 text-center">
          <p className="text-xs text-muted-foreground">AI analysis unavailable in dev mode</p>
        </div>
      )}

      {/* Meeting Detail Dialog */}
      <MeetingDetailDialog
        meeting={selectedMeeting}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
