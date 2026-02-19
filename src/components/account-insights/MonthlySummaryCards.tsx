 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { 
   Calendar,
   Smile,
   Meh,
   Frown,
   TrendingUp,
   TrendingDown,
   CheckCircle,
   AlertCircle,
   Sparkles,
   Users,
   ArrowUp,
   ArrowDown,
 } from "lucide-react";
 import { MonthlySummary } from "./types";
 
 interface MonthlySummaryCardsProps {
   monthlySummaries: MonthlySummary[];
 }
 
 export function MonthlySummaryCards({ monthlySummaries }: MonthlySummaryCardsProps) {
   // Sort by month (oldest first for left-to-right)
   const sortedSummaries = [...monthlySummaries].sort((a, b) => a.month.localeCompare(b.month));
 
   const getMoodIcon = (mood: string) => {
     switch (mood) {
       case "positive": return Smile;
       case "negative": return Frown;
       default: return Meh;
     }
   };
 
   const getMoodColor = (mood: string) => {
     switch (mood) {
       case "positive": return "bg-primary/20 text-primary";
       case "negative": return "bg-destructive/20 text-destructive";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   const getMoMChange = (current: MonthlySummary, next: MonthlySummary | undefined) => {
     if (!next) return null;
     const meetingDiff = next.meetingCount - current.meetingCount;
     return {
       meetings: meetingDiff,
       direction: meetingDiff > 0 ? "up" : meetingDiff < 0 ? "down" : "stable",
     };
   };
 
   return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
       {sortedSummaries.map((summary, index) => {
         const MoodIcon = getMoodIcon(summary.overallMood);
         const nextSummary = sortedSummaries[index + 1];
         const momChange = getMoMChange(summary, nextSummary);
 
         return (
           <Card key={summary.month} className="relative overflow-hidden">
             {/* Header */}
             <CardHeader className="pb-3">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <Calendar className="h-4 w-4 text-muted-foreground" />
                   <CardTitle className="text-base">{summary.monthLabel}</CardTitle>
                 </div>
                 <Badge className={getMoodColor(summary.overallMood)}>
                   <MoodIcon className="h-3 w-3 mr-1" />
                   {summary.overallMood}
                 </Badge>
               </div>
             </CardHeader>
 
             <CardContent className="space-y-4">
               {/* Stats Row */}
               <div className="flex items-center gap-4 text-sm">
                 <span className="font-medium">{summary.meetingCount} meetings</span>
                 <span className="text-muted-foreground">
                   {Math.round(summary.totalDuration / 60)}h
                 </span>
               </div>
 
               {/* Sentiment Bar */}
               <div className="flex items-center gap-2 text-xs">
                 <span className="text-primary">+{summary.sentimentBreakdown.positive}</span>
                 <span className="text-muted-foreground">○{summary.sentimentBreakdown.neutral}</span>
                 <span className="text-destructive">-{summary.sentimentBreakdown.negative}</span>
               </div>
 
               {/* MoM Change */}
               {momChange && momChange.direction !== "stable" && (
                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                   {momChange.direction === "up" ? (
                     <ArrowUp className="h-3 w-3 text-primary" />
                   ) : (
                     <ArrowDown className="h-3 w-3 text-destructive" />
                   )}
                   <span>
                     {Math.abs(momChange.meetings)} {momChange.direction === "up" ? "more" : "fewer"} meetings
                   </span>
                 </div>
               )}
 
               {/* Problems */}
               {(summary.problemsResolved.length > 0 || summary.openIssues.length > 0) && (
                 <div className="space-y-2">
                   {summary.problemsResolved.length > 0 && (
                     <div className="flex items-start gap-2">
                       <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                       <div className="text-xs text-muted-foreground">
                         {summary.problemsResolved.slice(0, 2).join(", ")}
                       </div>
                     </div>
                   )}
                   {summary.openIssues.length > 0 && (
                     <div className="flex items-start gap-2">
                       <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                       <div className="text-xs text-muted-foreground">
                         {summary.openIssues.slice(0, 2).join(", ")}
                       </div>
                     </div>
                   )}
                 </div>
               )}
 
               {/* Adoption Signals */}
               {(summary.adoptionSignals.newUsers.length > 0 || 
                 summary.adoptionSignals.existingUserGrowth.length > 0 ||
                 summary.adoptionSignals.productUsage.length > 0) && (
                 <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                   <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                     <Sparkles className="h-3 w-3 text-primary" />
                     Adoption Signals
                   </div>
                   <div className="space-y-1 text-xs text-muted-foreground">
                     {summary.adoptionSignals.newUsers.slice(0, 1).map((user, i) => (
                       <div key={i} className="flex items-center gap-1">
                         <Users className="h-3 w-3 text-primary" />
                         {user}
                       </div>
                     ))}
                     {summary.adoptionSignals.existingUserGrowth.slice(0, 1).map((growth, i) => (
                       <div key={i} className="flex items-center gap-1">
                         <TrendingUp className="h-3 w-3 text-primary" />
                         {growth}
                       </div>
                     ))}
                   </div>
                 </div>
               )}
 
               {/* Brief Summary */}
               {summary.briefSummary && (
                 <p className="text-xs text-muted-foreground line-clamp-2">
                   {summary.briefSummary}
                 </p>
               )}
 
               {/* Top Topics */}
               {summary.topTopics.length > 0 && (
                 <div className="flex flex-wrap gap-1">
                   {summary.topTopics.slice(0, 3).map((topic, i) => (
                     <Badge key={i} variant="secondary" className="text-xs">
                       {topic}
                     </Badge>
                   ))}
                 </div>
               )}
 
               {/* Key Highlight */}
               {summary.keyHighlights[0] && (
                 <div className="border-l-2 border-primary/50 pl-2">
                   <p className="text-xs italic text-muted-foreground line-clamp-2">
                     "{summary.keyHighlights[0]}"
                   </p>
                 </div>
               )}
             </CardContent>
           </Card>
         );
       })}
     </div>
   );
 }