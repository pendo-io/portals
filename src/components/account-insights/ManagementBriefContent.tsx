 import { useState, useCallback } from "react";
 import { useAuth } from "@/hooks/useAuth";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import {
   Building2,
   Loader2,
   FileText,
   Calendar,
   Clock,
   TrendingUp,
   TrendingDown,
   Minus,
   AlertTriangle,
   CheckCircle2,
   Trophy,
   Users,
   Target,
   BarChart3,
   Edit2,
   Check,
   X,
  Lightbulb,
  Rocket,
  MapPin,
  Compass,
  ArrowRight,
  Info,
 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { AccountInsightsLoader } from "./AccountInsightsLoader";
 import { ManagementBriefData } from "./types";
 import { cn } from "@/lib/utils";
 
 export function ManagementBriefContent() {
   const { user } = useAuth();
   const [salesforceId, setSalesforceId] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [briefData, setBriefData] = useState<ManagementBriefData | null>(null);
   
   // Editable display name
   const [displayName, setDisplayName] = useState("");
   const [isEditingName, setIsEditingName] = useState(false);
   const [tempName, setTempName] = useState("");
 
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
     setBriefData(null);
 
     try {
       const { data, error } = await supabase.functions.invoke("management-brief", {
         body: { salesforceAccountId: salesforceId.trim() },
       });
 
       if (error) throw error;
 
       if (!data?.success) {
         throw new Error(data?.error || "Failed to generate brief");
       }
 
       setBriefData(data.brief);
       setDisplayName(data.brief.displayName || data.brief.accountName);
       toast.success(`Generated Management Brief for ${data.brief.accountName}`, {
         position: "top-center",
       });
     } catch (error: any) {
       console.error("Error:", error);
       toast.error(error.message || "Failed to generate management brief");
     } finally {
       setIsLoading(false);
     }
   }, [salesforceId]);
 
   const startEditingName = () => {
     setTempName(displayName);
     setIsEditingName(true);
   };
 
   const saveName = () => {
     setDisplayName(tempName);
     setIsEditingName(false);
   };
 
   const cancelEdit = () => {
     setIsEditingName(false);
   };
 
   const getHealthColor = (health: string) => {
     switch (health) {
       case "healthy": return "bg-green-500/20 text-green-400 border-green-500/30";
       case "stable": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
       case "at-risk": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
       case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   const getSeverityColor = (severity: string) => {
     switch (severity) {
       case "critical": return "bg-red-500/20 text-red-400";
       case "high": return "bg-amber-500/20 text-amber-400";
       case "medium": return "bg-yellow-500/20 text-yellow-400";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   const getEngagementColor = (engagement: string) => {
     switch (engagement) {
       case "highly-engaged": return "text-green-400";
       case "engaged": return "text-emerald-400";
       case "moderate": return "text-blue-400";
       case "low": return "text-amber-400";
       case "disengaged": return "text-red-400";
       default: return "text-muted-foreground";
     }
   };
 
   const getSentimentIcon = (sentiment: string) => {
     switch (sentiment) {
       case "advocate": return <TrendingUp className="h-4 w-4 text-green-400" />;
       case "positive": return <TrendingUp className="h-4 w-4 text-emerald-400" />;
       case "neutral": return <Minus className="h-4 w-4 text-blue-400" />;
       case "skeptical": return <TrendingDown className="h-4 w-4 text-amber-400" />;
       case "detractor": return <TrendingDown className="h-4 w-4 text-red-400" />;
       default: return <Minus className="h-4 w-4" />;
     }
   };
 
   return (
    <div className="h-full flex flex-col">
      {isLoading ? (
        <AccountInsightsLoader isLoading={true} title="Generating Management Brief" tips={[
          "Fetching meeting history from Momentum...",
          "Analyzing 2-month meeting trends...",
          "Mapping stakeholder relationships...",
          "Evaluating relationship health...",
          "Identifying big wins and issues...",
          "Building forward outlook...",
          "Compiling management brief...",
        ]} />
      ) : (
        <>
      {/* Header */}
      <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
         <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
             <FileText className="h-5 w-5 text-primary-foreground" />
           </div>
           <div>
             <h1 className="text-page-title">Management Brief</h1>
             <p className="text-sm text-muted-foreground">
               Comprehensive 2-month account overview with stakeholder analysis
             </p>
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
                 Generating...
               </>
             ) : (
               <>
                 <FileText className="h-4 w-4 mr-2" />
                 Generate Brief
               </>
             )}
           </Button>
         </div>
       </div>
 
       {/* Content */}
       <ScrollArea className="flex-1">
         <div className="p-6 space-y-6">
           {!briefData && !isLoading && (
             <div className="flex flex-col items-center justify-center py-20 text-center">
               <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                 <FileText className="h-8 w-8 text-muted-foreground" />
               </div>
               <h3 className="text-section-title mb-2">Generate a Management Brief</h3>
               <p className="text-sm text-muted-foreground max-w-md">
                 Enter a Salesforce Account ID to generate a comprehensive 2-month management brief with detailed stakeholder analysis, wins, issues, and sentiment scoring.
               </p>
             </div>
           )}
 
           {briefData && (
             <>
               {/* Account Header with Editable Name */}
               <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-xl border border-border/50 p-6">
                 <div className="flex items-start justify-between mb-4">
                   <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                       <Building2 className="h-7 w-7 text-primary-foreground" />
                     </div>
                     <div>
                       {isEditingName ? (
                         <div className="flex items-center gap-2">
                           <Input
                             value={tempName}
                             onChange={(e) => setTempName(e.target.value)}
                             className="text-2xl font-bold h-10 w-64"
                             autoFocus
                           />
                           <Button size="icon" variant="ghost" onClick={saveName}>
                             <Check className="h-4 w-4 text-green-500" />
                           </Button>
                           <Button size="icon" variant="ghost" onClick={cancelEdit}>
                             <X className="h-4 w-4 text-red-500" />
                           </Button>
                         </div>
                       ) : (
                         <div className="flex items-center gap-2">
                           <h2 className="text-page-title tracking-tight">{displayName}</h2>
                           <Button size="icon" variant="ghost" onClick={startEditingName} className="h-8 w-8">
                             <Edit2 className="h-4 w-4 text-muted-foreground" />
                           </Button>
                         </div>
                       )}
                       <p className="text-xs text-muted-foreground font-mono mt-0.5">
                         ID: {briefData.accountId} • {briefData.periodCovered}
                       </p>
                     </div>
                   </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="flex items-center gap-3 cursor-pointer group">
                          <Badge className={cn("text-sm px-3 py-1 border", getHealthColor(briefData.overview.accountHealth))}>
                            {briefData.overview.accountHealth.replace("-", " ").toUpperCase()}
                          </Badge>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{briefData.overview.healthScore}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">Health Score <Info className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" /></div>
                          </div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" side="bottom" align="end">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <Badge className={cn("text-xs px-2 py-0.5 border", getHealthColor(briefData.overview.accountHealth))}>
                              {briefData.overview.accountHealth.replace("-", " ").toUpperCase()}
                            </Badge>
                            Score: {briefData.overview.healthScore}/100
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">Health Rationale</div>
                          <p className="text-sm leading-relaxed">{briefData.overview.healthRationale}</p>
                        </div>
                      </PopoverContent>
                    </Popover>
                 </div>
 
                 {/* Quick Stats */}
                 <div className="grid grid-cols-4 gap-4 mt-4">
                   <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                     <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                       <Calendar className="h-3.5 w-3.5" />
                       Meetings
                     </div>
                     <div className="text-xl font-bold">{briefData.meetingStats.totalMeetings}</div>
                   </div>
                   <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                     <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                       <Clock className="h-3.5 w-3.5" />
                       Total Time
                     </div>
                     <div className="text-xl font-bold">{briefData.meetingStats.totalHours}h</div>
                   </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="bg-background/50 rounded-lg p-3 border border-border/30 cursor-pointer hover:border-primary/30 transition-colors group">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Sentiment
                            <Info className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity ml-auto" />
                          </div>
                          <div className="text-xl font-bold">{briefData.sentimentAnalysis.overallScore}/10</div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-96" side="bottom">
                        <div className="space-y-3">
                          <div className="text-sm font-semibold">Sentiment Breakdown</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                              <div className="bg-green-500 h-full" style={{ width: `${briefData.sentimentAnalysis.breakdown.positive}%` }} />
                              <div className="bg-blue-500 h-full" style={{ width: `${briefData.sentimentAnalysis.breakdown.neutral}%` }} />
                              <div className="bg-red-500 h-full" style={{ width: `${briefData.sentimentAnalysis.breakdown.negative}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500" />Positive {briefData.sentimentAnalysis.breakdown.positive}%</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" />Neutral {briefData.sentimentAnalysis.breakdown.neutral}%</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" />Negative {briefData.sentimentAnalysis.breakdown.negative}%</span>
                          </div>
                          {briefData.sentimentAnalysis.trendAnalysis && (
                            <p className="text-xs text-muted-foreground">{briefData.sentimentAnalysis.trendAnalysis}</p>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {briefData.sentimentAnalysis.keyPositiveDrivers.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-400 mb-1">Positive Drivers</div>
                                <ul className="text-xs space-y-0.5">
                                  {briefData.sentimentAnalysis.keyPositiveDrivers.slice(0, 3).map((d, i) => (
                                    <li key={i} className="flex items-start gap-1"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />{d}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {briefData.sentimentAnalysis.keyNegativeDrivers.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-red-400 mb-1">Negative Drivers</div>
                                <ul className="text-xs space-y-0.5">
                                  {briefData.sentimentAnalysis.keyNegativeDrivers.slice(0, 3).map((d, i) => (
                                    <li key={i} className="flex items-start gap-1"><AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />{d}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          {briefData.sentimentAnalysis.sentimentByStakeholder.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">By Stakeholder</div>
                              <div className="grid grid-cols-2 gap-1">
                                {briefData.sentimentAnalysis.sentimentByStakeholder.slice(0, 6).map((s, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                                    <span className="truncate">{s.name}</span>
                                    <span className="font-medium ml-1">{s.score}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="bg-background/50 rounded-lg p-3 border border-border/30 cursor-pointer hover:border-primary/30 transition-colors group">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Target className="h-3.5 w-3.5" />
                            Momentum
                            <Info className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity ml-auto" />
                          </div>
                          <div className="text-xl font-bold capitalize">{briefData.overview.momentum}</div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" side="bottom">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold">Momentum: <span className="capitalize">{briefData.overview.momentum}</span></div>
                          {briefData.overview.executiveContext && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">Engagement Pattern</div>
                              <p className="text-xs leading-relaxed">{briefData.overview.executiveContext}</p>
                            </div>
                          )}
                          {briefData.overview.relationshipJourney && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">Relationship Journey</div>
                              <p className="text-xs leading-relaxed">{briefData.overview.relationshipJourney}</p>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                 </div>
               </div>
 
               {/* Executive Overview */}
               <Card className="border-border/50">
                 <CardHeader className="pb-3">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <FileText className="h-5 w-5 text-primary" />
                     Executive Overview
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    {/* Main Executive Narrative */}
                    <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Executive Summary</span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{briefData.overview.executiveNarrative}</p>
                    </div>
                    
                    {/* Deep Context Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Situational Context */}
                      {briefData.overview.executiveContext && (
                        <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Compass className="h-4 w-4 text-blue-400" />
                            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Situational Context</span>
                          </div>
                          <p className="text-sm leading-relaxed">{briefData.overview.executiveContext}</p>
                        </div>
                      )}
                      
                      {/* Relationship Journey */}
                      {briefData.overview.relationshipJourney && (
                        <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-purple-400" />
                            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Relationship Journey</span>
                          </div>
                          <p className="text-sm leading-relaxed">{briefData.overview.relationshipJourney}</p>
                        </div>
                      )}
                      
                      {/* Current State */}
                      {briefData.overview.currentState && (
                        <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Where We Are Now</span>
                          </div>
                          <p className="text-sm leading-relaxed">{briefData.overview.currentState}</p>
                        </div>
                      )}
                      
                      {/* Future Direction */}
                      {briefData.overview.futureDirection && (
                        <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Rocket className="h-4 w-4 text-green-400" />
                            <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Where We're Heading</span>
                          </div>
                          <p className="text-sm leading-relaxed">{briefData.overview.futureDirection}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Health Rationale */}
                   <div className="bg-muted/30 rounded-lg p-4">
                     <div className="text-xs font-medium text-muted-foreground mb-2">Health Rationale</div>
                     <p className="text-sm">{briefData.overview.healthRationale}</p>
                   </div>
                 </CardContent>
               </Card>
 
                {/* Use Case Focus Section */}
                {briefData.useCaseFocus && briefData.useCaseFocus.length > 0 && (
                  <Card className="border-blue-500/20 bg-blue-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                        <Lightbulb className="h-5 w-5" />
                        Use Case Focus ({briefData.useCaseFocus.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {briefData.useCaseFocus.map((useCase, i) => (
                        <div key={i} className="bg-background/50 rounded-xl p-5 border border-blue-500/20">
                          {/* Use Case Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-base flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                                  {i + 1}
                                </span>
                                {useCase.useCaseName}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={cn(
                                  "text-xs capitalize",
                                  useCase.currentStatus === "active" && "bg-green-500/20 text-green-400 border-green-500/30",
                                  useCase.currentStatus === "exploring" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                                  useCase.currentStatus === "piloting" && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                                  useCase.currentStatus === "expanding" && "bg-purple-500/20 text-purple-400 border-purple-500/30",
                                  useCase.currentStatus === "at-risk" && "bg-red-500/20 text-red-400 border-red-500/30"
                                )}>
                                  {useCase.currentStatus}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{useCase.adoptionStage}</span>
                              </div>
                            </div>
                            {useCase.timeline && (
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Timeline</div>
                                <div className="text-sm font-medium">{useCase.timeline}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Description */}
                          <p className="text-sm leading-relaxed mb-4">{useCase.description}</p>
                          
                          {/* Grid of Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Key Stakeholders */}
                            {useCase.keyStakeholders && useCase.keyStakeholders.length > 0 && (
                              <div className="bg-muted/30 rounded-lg p-3">
                                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5" />
                                  Key Stakeholders
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {useCase.keyStakeholders.map((s, j) => (
                                    <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Success Metrics */}
                            {useCase.successMetrics && useCase.successMetrics.length > 0 && (
                              <div className="bg-muted/30 rounded-lg p-3">
                                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                  <BarChart3 className="h-3.5 w-3.5" />
                                  Success Metrics
                                </div>
                                <ul className="text-xs space-y-0.5">
                                  {useCase.successMetrics.map((m, j) => (
                                    <li key={j} className="flex items-start gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                      {m}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Challenges */}
                            {useCase.challenges && useCase.challenges.length > 0 && (
                              <div className="bg-amber-500/10 rounded-lg p-3">
                                <div className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Challenges
                                </div>
                                <ul className="text-xs space-y-0.5">
                                  {useCase.challenges.map((c, j) => (
                                    <li key={j} className="flex items-start gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Opportunities */}
                            {useCase.opportunities && useCase.opportunities.length > 0 && (
                              <div className="bg-green-500/10 rounded-lg p-3">
                                <div className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1.5">
                                  <TrendingUp className="h-3.5 w-3.5" />
                                  Opportunities
                                </div>
                                <ul className="text-xs space-y-0.5">
                                  {useCase.opportunities.map((o, j) => (
                                    <li key={j} className="flex items-start gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                      {o}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          {/* Recommended Actions */}
                          {useCase.recommendedActions && useCase.recommendedActions.length > 0 && (
                            <div className="bg-primary/10 rounded-lg p-3 mb-3">
                              <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                                <ArrowRight className="h-3.5 w-3.5" />
                                Recommended Actions
                              </div>
                              <ul className="text-xs space-y-1">
                                {useCase.recommendedActions.map((a, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                      {j + 1}
                                    </span>
                                    {a}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Business Value */}
                          {useCase.businessValue && (
                            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-3 border border-green-500/20">
                              <div className="text-xs font-semibold text-green-400 mb-1">Business Value</div>
                              <p className="text-sm">{useCase.businessValue}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

               {/* Big Wins & Major Highlights */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {/* Big Wins */}
                 <Card className="border-green-500/20 bg-green-500/5">
                   <CardHeader className="pb-3">
                     <CardTitle className="text-lg flex items-center gap-2 text-green-400">
                       <Trophy className="h-5 w-5" />
                       Big Wins ({Array.isArray(briefData.bigWins) ? briefData.bigWins.length : 0})
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-3">
                  {!Array.isArray(briefData.bigWins) || briefData.bigWins.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No major wins recorded in this period</p>
                  ) : (
                    briefData.bigWins.map((win, i) => (
                         <div key={i} className="bg-background/50 rounded-lg p-3 border border-green-500/20">
                           <div className="flex items-start justify-between mb-1">
                             <div className="font-medium text-sm">{win.title}</div>
                             <span className="text-xs text-muted-foreground">{win.date}</span>
                           </div>
                           <p className="text-sm text-muted-foreground mb-2">{win.description}</p>
                           <div className="flex items-center gap-1.5 text-xs text-green-400">
                             <CheckCircle2 className="h-3.5 w-3.5" />
                             {win.businessImpact}
                           </div>
                         </div>
                       ))
                     )}
                   </CardContent>
                 </Card>
 
                 {/* Major Highlights */}
                 <Card className="border-primary/20 bg-primary/5">
                   <CardHeader className="pb-3">
                     <CardTitle className="text-lg flex items-center gap-2">
                       <Target className="h-5 w-5 text-primary" />
                       Major Highlights ({Array.isArray(briefData.majorHighlights) ? briefData.majorHighlights.length : 0})
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-3">
                  {!Array.isArray(briefData.majorHighlights) || briefData.majorHighlights.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No major highlights recorded</p>
                  ) : (
                    briefData.majorHighlights.map((highlight, i) => (
                         <div key={i} className="bg-background/50 rounded-lg p-3 border border-border/30">
                           <div className="flex items-start justify-between mb-1">
                             <div className="font-medium text-sm">{highlight.title}</div>
                             <Badge variant="outline" className="text-xs">
                               {highlight.impact}
                             </Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">{highlight.description}</p>
                           <div className="text-xs text-muted-foreground mt-1">{highlight.date}</div>
                         </div>
                       ))
                     )}
                   </CardContent>
                 </Card>
               </div>
 
               {/* Main Issues (Top 3) */}
               <Card className="border-amber-500/20 bg-amber-500/5">
                 <CardHeader className="pb-3">
                   <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
                     <AlertTriangle className="h-5 w-5" />
                     Key Issues ({Array.isArray(briefData.mainIssues) ? briefData.mainIssues.length : 0})
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                  {!Array.isArray(briefData.mainIssues) || briefData.mainIssues.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No major issues identified</p>
                  ) : (
                    briefData.mainIssues.map((issue, i) => (
                       <div key={i} className="bg-background/50 rounded-lg p-4 border border-amber-500/20">
                         <div className="flex items-start justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <span className="font-semibold">{i + 1}.</span>
                             <Badge className={getSeverityColor(issue.severity)}>
                               {(issue.severity || "medium").toUpperCase()}
                             </Badge>
                             <span className="font-medium">{issue.issue}</span>
                           </div>
                           <Badge variant="outline" className="text-xs">
                             {issue.status}
                           </Badge>
                         </div>
                         <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>
                         {Array.isArray(issue.evidence) && issue.evidence.length > 0 && (
                           <div className="mb-3">
                             <div className="text-xs font-medium text-muted-foreground mb-1">Evidence:</div>
                             <ul className="text-xs text-muted-foreground space-y-0.5">
                               {issue.evidence.map((e, j) => (
                                 <li key={j} className="flex items-start gap-1.5">
                                   <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                   {e}
                                 </li>
                               ))}
                             </ul>
                           </div>
                         )}
                         <div className="bg-amber-500/10 rounded p-2">
                           <div className="text-xs font-medium text-amber-400 mb-0.5">Suggested Resolution:</div>
                           <p className="text-xs">{issue.suggestedResolution}</p>
                         </div>
                       </div>
                     ))
                   )}
                 </CardContent>
               </Card>
 
               {/* Comprehensive Stakeholder Breakdown */}
               <Card className="border-border/50">
                 <CardHeader className="pb-3">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Users className="h-5 w-5 text-primary" />
                     Stakeholder Breakdown ({Array.isArray(briefData.stakeholderBreakdown) ? briefData.stakeholderBreakdown.length : 0} contacts)
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                  <div className="space-y-4">
                    {(Array.isArray(briefData.stakeholderBreakdown) ? briefData.stakeholderBreakdown : []).map((person, i) => (
                       <div key={i} className="bg-muted/20 rounded-lg p-4 border border-border/30">
                         <div className="flex items-start justify-between mb-3">
                           <div>
                             <div className="flex items-center gap-2">
                               <span className="font-semibold">{person.name}</span>
                               {getSentimentIcon(person.sentiment)}
                             </div>
                             <div className="text-sm text-muted-foreground">{person.email}</div>
                             {person.title && (
                               <div className="text-sm text-primary">{person.title}{person.department ? ` • ${person.department}` : ""}</div>
                             )}
                           </div>
                           <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-xs capitalize">
                               {person.influence}
                             </Badge>
                             <Badge variant="outline" className={cn("text-xs capitalize", getEngagementColor(person.engagement))}>
                               {person.engagement.replace("-", " ")}
                             </Badge>
                           </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                           <div>
                             <span className="text-muted-foreground">Meetings:</span> <span className="font-medium">{person.meetingCount}</span>
                           </div>
                           <div>
                             <span className="text-muted-foreground">Last Seen:</span> <span className="font-medium">{person.lastSeen}</span>
                           </div>
                         </div>
 
                         {person.keyQuotes && person.keyQuotes.length > 0 && (
                           <div className="mb-3">
                             <div className="text-xs font-medium text-muted-foreground mb-1">Key Quotes:</div>
                             <div className="space-y-1">
                               {person.keyQuotes.map((quote, j) => (
                                 <div key={j} className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
                                   "{quote}"
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
 
                         {person.concerns && person.concerns.length > 0 && (
                           <div className="mb-3">
                             <div className="text-xs font-medium text-amber-400 mb-1">Concerns:</div>
                             <ul className="text-xs text-muted-foreground space-y-0.5">
                               {person.concerns.map((c, j) => (
                                 <li key={j}>• {c}</li>
                               ))}
                             </ul>
                           </div>
                         )}
 
                         {person.interests && person.interests.length > 0 && (
                           <div className="mb-3">
                             <div className="text-xs font-medium text-green-400 mb-1">Interests:</div>
                             <ul className="text-xs text-muted-foreground space-y-0.5">
                               {person.interests.map((int, j) => (
                                 <li key={j}>• {int}</li>
                               ))}
                             </ul>
                           </div>
                         )}
 
                         <div className="bg-background/50 rounded p-2 mt-2">
                           <div className="text-xs font-medium text-muted-foreground mb-0.5">Relationship Notes:</div>
                           <p className="text-xs">{person.relationshipNotes}</p>
                         </div>
 
                         <div className="bg-primary/10 rounded p-2 mt-2">
                           <div className="text-xs font-medium text-primary mb-0.5">Recommended Approach:</div>
                           <p className="text-xs">{person.recommendedApproach}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
 
               {/* Sentiment Analysis */}
               <Card className="border-border/50">
                 <CardHeader className="pb-3">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <BarChart3 className="h-5 w-5 text-primary" />
                     Sentiment Analysis
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   {/* Sentiment Bar */}
                   <div className="flex items-center gap-2">
                     <div className="flex-1 h-4 rounded-full overflow-hidden flex">
                       <div 
                         className="bg-green-500 h-full" 
                         style={{ width: `${briefData.sentimentAnalysis.breakdown.positive}%` }}
                       />
                       <div 
                         className="bg-blue-500 h-full" 
                         style={{ width: `${briefData.sentimentAnalysis.breakdown.neutral}%` }}
                       />
                       <div 
                         className="bg-red-500 h-full" 
                         style={{ width: `${briefData.sentimentAnalysis.breakdown.negative}%` }}
                       />
                     </div>
                     <div className="text-sm font-bold w-16 text-right">{briefData.sentimentAnalysis.overallScore}/10</div>
                   </div>
                   
                   <div className="flex items-center gap-4 text-xs">
                     <span className="flex items-center gap-1">
                       <span className="w-3 h-3 rounded bg-green-500" /> 
                       Positive {briefData.sentimentAnalysis.breakdown.positive}%
                     </span>
                     <span className="flex items-center gap-1">
                       <span className="w-3 h-3 rounded bg-blue-500" /> 
                       Neutral {briefData.sentimentAnalysis.breakdown.neutral}%
                     </span>
                     <span className="flex items-center gap-1">
                       <span className="w-3 h-3 rounded bg-red-500" /> 
                       Negative {briefData.sentimentAnalysis.breakdown.negative}%
                     </span>
                   </div>
 
                   <p className="text-sm text-muted-foreground">{briefData.sentimentAnalysis.trendAnalysis}</p>
 
                   <div className="grid grid-cols-2 gap-4">
                     <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                       <div className="text-xs font-medium text-green-400 mb-2">Positive Drivers</div>
                       <ul className="text-xs space-y-1">
                         {(Array.isArray(briefData.sentimentAnalysis.keyPositiveDrivers) ? briefData.sentimentAnalysis.keyPositiveDrivers : []).map((d, i) => (
                           <li key={i} className="flex items-start gap-1.5">
                             <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                             {d}
                           </li>
                         ))}
                       </ul>
                     </div>
                     <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                       <div className="text-xs font-medium text-red-400 mb-2">Negative Drivers</div>
                       <ul className="text-xs space-y-1">
                         {(Array.isArray(briefData.sentimentAnalysis.keyNegativeDrivers) ? briefData.sentimentAnalysis.keyNegativeDrivers : []).map((d, i) => (
                           <li key={i} className="flex items-start gap-1.5">
                             <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                             {d}
                           </li>
                         ))}
                       </ul>
                     </div>
                   </div>
 
                   {/* Sentiment by Stakeholder */}
                  {Array.isArray(briefData.sentimentAnalysis.sentimentByStakeholder) && briefData.sentimentAnalysis.sentimentByStakeholder.length > 0 && (
                     <div>
                       <div className="text-xs font-medium text-muted-foreground mb-2">Sentiment by Stakeholder</div>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                         {briefData.sentimentAnalysis.sentimentByStakeholder.map((s, i) => (
                           <div key={i} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                             <span className="text-xs truncate">{s.name}</span>
                             <div className="flex items-center gap-1">
                               <span className="text-xs font-medium">{s.score}</span>
                               {s.trend === "up" && <TrendingUp className="h-3 w-3 text-green-400" />}
                               {s.trend === "stable" && <Minus className="h-3 w-3 text-blue-400" />}
                               {s.trend === "down" && <TrendingDown className="h-3 w-3 text-red-400" />}
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </CardContent>
               </Card>
 
               {/* Outlook */}
               <Card className="border-border/50 bg-gradient-to-br from-card to-primary/5">
                 <CardHeader className="pb-3">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <TrendingUp className="h-5 w-5 text-primary" />
                     Forward Outlook
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <p className="text-sm">{briefData.outlook.trajectory}</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                       <div className="text-xs font-medium text-primary mb-2">Next Steps</div>
                       <ul className="text-xs space-y-1">
                         {(Array.isArray(briefData.outlook.nextSteps) ? briefData.outlook.nextSteps : []).map((step, i) => (
                           <li key={i} className="flex items-start gap-1.5">
                             <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                             {step}
                           </li>
                         ))}
                       </ul>
                     </div>
                     <div>
                       <div className="text-xs font-medium text-amber-400 mb-2">Risks to Watch</div>
                       <ul className="text-xs space-y-1">
                         {(Array.isArray(briefData.outlook.risksToWatch) ? briefData.outlook.risksToWatch : []).map((risk, i) => (
                           <li key={i} className="flex items-start gap-1.5">
                             <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                             {risk}
                           </li>
                         ))}
                       </ul>
                     </div>
                     <div>
                       <div className="text-xs font-medium text-green-400 mb-2">Opportunities</div>
                       <ul className="text-xs space-y-1">
                         {(Array.isArray(briefData.outlook.opportunities) ? briefData.outlook.opportunities : []).map((opp, i) => (
                           <li key={i} className="flex items-start gap-1.5">
                             <Target className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                             {opp}
                           </li>
                         ))}
                       </ul>
                     </div>
                   </div>
                 </CardContent>
               </Card>
 
               {/* Generated timestamp */}
               <div className="text-xs text-center text-muted-foreground pt-4">
                 Generated: {new Date(briefData.generatedAt).toLocaleString()}
               </div>
             </>
           )}
         </div>
      </ScrollArea>
        </>
      )}
    </div>
  );
 }