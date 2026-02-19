 import { useState, useCallback } from "react";
 import { useAuth } from "@/hooks/useAuth";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { 
   Sparkles,
   Building2,
   Calendar,
   Clock,
   TrendingUp,
   TrendingDown,
   Minus,
   AlertTriangle,
   Target,
   DollarSign,
   CalendarClock,
  Loader2,
  Info,
 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 
 import { AccountInsightsLoader } from "./AccountInsightsLoader";
 import { AccountMeetingDetailDialog } from "./AccountMeetingDetailDialog";
 import { MonthlySummaryCards } from "./MonthlySummaryCards";
 import { MeetingTimeline } from "./MeetingTimeline";
 import { StakeholderCards } from "./StakeholderCards";
 import { OpportunityRenewalCards } from "./OpportunityRenewalCards";
 import { PriorityActionsCard } from "./PriorityActionsCard";
 import { AccountMeetingInsights, MeetingDetail } from "./types";
 import { cn } from "@/lib/utils";
 
 export function AccountInsightsContent() {
   const { user } = useAuth();
   const [salesforceId, setSalesforceId] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [insights, setInsights] = useState<AccountMeetingInsights | null>(null);
   const [selectedMeeting, setSelectedMeeting] = useState<MeetingDetail | null>(null);
   const [dialogOpen, setDialogOpen] = useState(false);
 
   const handleAnalyze = useCallback(async () => {
     if (!salesforceId.trim()) {
       toast.error("Please enter a Salesforce Account ID");
       return;
     }
 
     if (salesforceId.trim().length !== 18 && salesforceId.trim().length !== 15) {
       toast.error("Salesforce Account ID must be 15 or 18 characters");
       return;
     }
 
     setIsLoading(true);
     setInsights(null);
 
     try {
       const { data, error } = await supabase.functions.invoke("account-insights", {
         body: { salesforceAccountId: salesforceId.trim() },
       });
 
       if (error) throw error;
 
       if (!data?.success) {
         throw new Error(data?.error || "Failed to analyze account");
       }
 
       setInsights(data.insights);
       toast.success(`Analyzed ${data.insights.totalMeetings} meetings for ${data.insights.accountName}`, {
         position: "top-center",
       });
     } catch (error: any) {
       console.error("Error:", error);
       if (error.message?.includes("429")) {
         toast.error("Rate limit exceeded. Please wait and try again.");
       } else if (error.message?.includes("402")) {
         toast.error("API credits depleted.");
       } else {
         toast.error(error.message || "Failed to analyze account");
       }
     } finally {
       setIsLoading(false);
     }
   }, [salesforceId]);
 
   const handleMeetingClick = (meeting: MeetingDetail) => {
     setSelectedMeeting(meeting);
     setDialogOpen(true);
   };
 
   const getEngagementIcon = (trend: string) => {
     switch (trend) {
       case "increasing": return TrendingUp;
       case "decreasing": return TrendingDown;
       default: return Minus;
     }
   };
 
   const getHealthColor = (health: string) => {
     const h = health?.toLowerCase() || "";
     if (h.includes("healthy") || h.includes("growing")) return "bg-primary/20 text-primary";
     if (h.includes("risk") || h.includes("critical")) return "bg-destructive/20 text-destructive";
     return "bg-muted text-muted-foreground";
   };
 
   return (
    <div className="h-full flex flex-col">
      {isLoading ? (
        <AccountInsightsLoader isLoading={true} />
      ) : (
        <>
        {/* Header */}
        <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
               <Building2 className="h-5 w-5 text-primary-foreground" />
             </div>
             <div>
               <h1 className="text-page-title">Account Insights</h1>
               <p className="text-sm text-muted-foreground">
                 3-month meeting history analysis with AI-powered insights
               </p>
             </div>
           </div>
         </div>
       </div>
 
       {/* Input Bar */}
       <div className="border-b border-border/50 px-6 py-4 bg-card/50">
         <div className="flex items-end gap-4">
           <div className="flex-1 max-w-md">
             <Label htmlFor="sfId" className="text-sm font-medium mb-1.5 block">
               Salesforce Account ID
             </Label>
             <Input
               id="sfId"
               placeholder="Enter 18-character Salesforce Account ID"
               value={salesforceId}
               onChange={(e) => setSalesforceId(e.target.value)}
               className="font-mono"
             />
           </div>
           <Button onClick={handleAnalyze} disabled={isLoading || !salesforceId.trim()}>
             {isLoading ? (
               <>
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                 Analyzing...
               </>
             ) : (
               <>
                 <Sparkles className="h-4 w-4 mr-2" />
                 Analyze Account
               </>
             )}
           </Button>
         </div>
       </div>
 
       {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
           {!insights && !isLoading && (
             <div className="flex flex-col items-center justify-center py-20 text-center">
               <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                 <Building2 className="h-8 w-8 text-muted-foreground" />
               </div>
               <h3 className="text-section-title mb-2">Enter a Salesforce Account ID</h3>
               <p className="text-sm text-muted-foreground max-w-md">
                 We'll analyze the last 3 months of meeting history and generate AI-powered insights about the customer relationship.
               </p>
             </div>
           )}
 
           {insights && (
             <>
               {/* Client Header with Critical Data */}
                <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/30 shadow-lg">
                 <CardContent className="py-4">
                   <div className="flex flex-col gap-4">
                     {/* Client Name - Prominent */}
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                            <Building2 className="h-7 w-7 text-primary-foreground" />
                         </div>
                         <div>
                            <h2 className="text-page-title tracking-tight">{insights.accountName}</h2>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {insights.accountId}</p>
                         </div>
                       </div>
                        {insights.executiveContext.relationshipHealth && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer group flex items-center gap-2">
                                <Badge className={cn("text-sm px-3 py-1", getHealthColor(insights.executiveContext.relationshipHealth))}>
                                  {insights.executiveContext.relationshipHealth}
                                </Badge>
                                <Info className="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" side="bottom" align="end">
                              <div className="space-y-3">
                                <div className="text-sm font-semibold">Relationship Health</div>
                                {insights.executiveContext.engagementPattern && (
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground mb-1">Engagement Pattern</div>
                                    <p className="text-xs leading-relaxed">{insights.executiveContext.engagementPattern}</p>
                                  </div>
                                )}
                                {insights.executiveContext.criticalMoments && insights.executiveContext.criticalMoments.length > 0 && (
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground mb-1">Critical Moments</div>
                                    <ul className="text-xs space-y-1">
                                      {insights.executiveContext.criticalMoments.map((m: string, i: number) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                          <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                          {m}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {Array.isArray(insights.executiveContext.nextSteps) && insights.executiveContext.nextSteps.length > 0 && (
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground mb-1">Next Steps</div>
                                    <ul className="text-xs space-y-1">
                                      {insights.executiveContext.nextSteps.map((s: string, i: number) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                          <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                          {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                     </div>
 
                     {/* Critical Data Widgets */}
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                       {insights.accountCoreData.arr && (
                         <div className="p-3 rounded-lg bg-card border border-border/50 flex items-center gap-3">
                           <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                             <DollarSign className="h-4 w-4 text-primary" />
                           </div>
                           <div>
                             <div className="text-lg font-bold">${(insights.accountCoreData.arr / 1000).toFixed(0)}K</div>
                             <div className="text-xs text-muted-foreground">ARR</div>
                           </div>
                         </div>
                       )}
                       {insights.accountCoreData.renewalDate && (
                         <div className="p-3 rounded-lg bg-card border border-border/50 flex items-center gap-3">
                           <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                             <CalendarClock className="h-4 w-4 text-primary" />
                           </div>
                           <div>
                             <div className="text-lg font-bold">{insights.accountCoreData.renewalDate}</div>
                             <div className="text-xs text-muted-foreground">Renewal</div>
                           </div>
                         </div>
                       )}
                       <div className="p-3 rounded-lg bg-card border border-border/50 flex items-center gap-3">
                         <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                           <Calendar className="h-4 w-4 text-primary" />
                         </div>
                         <div>
                           <div className="text-lg font-bold">{insights.totalMeetings}</div>
                           <div className="text-xs text-muted-foreground">Meetings</div>
                         </div>
                       </div>
                       <div className="p-3 rounded-lg bg-card border border-border/50 flex items-center gap-3">
                         <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                           <Clock className="h-4 w-4 text-muted-foreground" />
                         </div>
                         <div>
                           <div className="text-lg font-bold">{Math.round(insights.totalDuration / 60)}h</div>
                           <div className="text-xs text-muted-foreground">Total Time</div>
                         </div>
                       </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="p-3 rounded-lg bg-card border border-border/50 flex items-center gap-3 cursor-pointer group">
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                              {(() => {
                                const Icon = getEngagementIcon(insights.engagementTrend);
                                return <Icon className={cn(
                                  "h-4 w-4",
                                  insights.engagementTrend === "increasing" ? "text-primary" :
                                  insights.engagementTrend === "decreasing" ? "text-destructive" :
                                  "text-muted-foreground"
                                )} />;
                              })()}
                            </div>
                            <div className="flex-1">
                              <div className="text-lg font-bold capitalize">{insights.engagementTrend}</div>
                              <div className="text-xs text-muted-foreground">Engagement</div>
                            </div>
                            <Info className="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" side="bottom" align="end">
                          <div className="space-y-3">
                            <div className="text-sm font-semibold">Engagement Trend</div>
                            {insights.executiveContext.engagementPattern && (
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Pattern</div>
                                <p className="text-xs leading-relaxed">{insights.executiveContext.engagementPattern}</p>
                              </div>
                            )}
                            {insights.executiveContext.criticalMoments && insights.executiveContext.criticalMoments.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Critical Moments</div>
                                <ul className="text-xs space-y-1">
                                  {insights.executiveContext.criticalMoments.map((m: string, i: number) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                      {m}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                     </div>
                   </div>
                 </CardContent>
               </Card>
 
               {/* Executive Summary - Compact */}
               <Card className="border-border/50">
                 <CardContent className="py-4">
                   <div className="flex items-start gap-3">
                     <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                     <div className="space-y-2">
                       <p className="text-sm leading-relaxed">{insights.executiveSummary}</p>
                       {insights.executiveContext.engagementPattern && (
                         <p className="text-xs text-muted-foreground">
                           <span className="font-medium">Pattern: </span>
                           {insights.executiveContext.engagementPattern}
                         </p>
                       )}
                     </div>
                   </div>
                 </CardContent>
               </Card>
 
               {/* SECTION: Recommended Actions & Priority Actions - BEFORE Timeline */}
               <PriorityActionsCard 
                 actions={insights.recentPriorityActions || []}
                 actionRecommendations={insights.actionRecommendations}
               />
 
               {/* SECTION: Opportunity Picks & Renewal Concerns */}
               <OpportunityRenewalCards
                 opportunities={insights.opportunityPicks || []}
                 concerns={insights.renewalConcerns || []}
               />
 
               {/* SECTION: Champions & Stakeholders */}
               <StakeholderCards
                 stakeholders={insights.stakeholders || []}
                 champions={insights.champions || []}
               />
 
               {/* Signals Section - Compact */}
               {(insights.adoptionSignals.length > 0 || insights.riskSignals.length > 0 || insights.opportunitySignals.length > 0) && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {insights.adoptionSignals.length > 0 && (
                     <Card className="border-primary/20 bg-primary/5">
                       <CardHeader className="pb-2 pt-3">
                         <CardTitle className="text-sm flex items-center gap-2">
                           <Sparkles className="h-4 w-4 text-primary" />
                           Adoption Signals
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="pb-3">
                         <ul className="text-xs space-y-1">
                           {insights.adoptionSignals.slice(0, 3).map((signal, i) => (
                             <li key={i} className="flex items-start gap-1.5">
                               <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                               <span className="line-clamp-2">{signal}</span>
                             </li>
                           ))}
                         </ul>
                       </CardContent>
                     </Card>
                   )}
 
                   {insights.riskSignals.length > 0 && (
                     <Card className="border-destructive/20 bg-destructive/5">
                       <CardHeader className="pb-2 pt-3">
                         <CardTitle className="text-sm flex items-center gap-2">
                           <AlertTriangle className="h-4 w-4 text-destructive" />
                           Risk Signals
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="pb-3">
                         <ul className="text-xs space-y-1">
                           {insights.riskSignals.slice(0, 3).map((signal, i) => (
                             <li key={i} className="flex items-start gap-1.5">
                               <span className="w-1 h-1 rounded-full bg-destructive mt-1.5 shrink-0" />
                               <span className="line-clamp-2">{signal}</span>
                             </li>
                           ))}
                         </ul>
                       </CardContent>
                     </Card>
                   )}
 
                   {insights.opportunitySignals.length > 0 && (
                     <Card className="border-primary/20 bg-primary/5">
                       <CardHeader className="pb-2 pt-3">
                         <CardTitle className="text-sm flex items-center gap-2">
                           <Target className="h-4 w-4 text-primary" />
                           Opportunity Signals
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="pb-3">
                         <ul className="text-xs space-y-1">
                           {insights.opportunitySignals.slice(0, 3).map((signal, i) => (
                             <li key={i} className="flex items-start gap-1.5">
                               <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                               <span className="line-clamp-2">{signal}</span>
                             </li>
                           ))}
                         </ul>
                       </CardContent>
                     </Card>
                   )}
                 </div>
               )}
 
               {/* Monthly Overview */}
               {insights.monthlySummaries.length > 0 && (
                 <div>
                   <h2 className="text-section-title mb-4">Monthly Overview</h2>
                   <MonthlySummaryCards monthlySummaries={insights.monthlySummaries} />
                 </div>
               )}
 
               {/* Meeting Timeline */}
               {insights.meetings.length > 0 && (
                 <div>
                   <h2 className="text-section-title mb-4">Meeting Timeline</h2>
                   <MeetingTimeline 
                     meetings={insights.meetings}
                     monthlySummaries={insights.monthlySummaries}
                     onMeetingClick={handleMeetingClick}
                   />
                 </div>
               )}
             </>
           )}
         </div>
      </div>
        </>
      )}

      {/* Meeting Detail Dialog */}
       <AccountMeetingDetailDialog
         meeting={selectedMeeting}
         open={dialogOpen}
         onOpenChange={setDialogOpen}
       />
     </div>
   );
 }