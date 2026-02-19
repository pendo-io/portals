 import { useState } from "react";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
 } from "@/components/ui/collapsible";
 import { 
   ChevronDown,
   Clock,
   Users,
   CheckCircle2,
 } from "lucide-react";
 import { format, parseISO } from "date-fns";
 import { cn } from "@/lib/utils";
 import { MeetingDetail, MonthlySummary } from "./types";
 
 interface MeetingTimelineProps {
   meetings: MeetingDetail[];
   monthlySummaries: MonthlySummary[];
   onMeetingClick: (meeting: MeetingDetail) => void;
 }
 
 export function MeetingTimeline({ meetings, monthlySummaries, onMeetingClick }: MeetingTimelineProps) {
   const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
 
   // Group meetings by month
   const meetingsByMonth = meetings.reduce((acc, meeting) => {
     const month = format(parseISO(meeting.date), "yyyy-MM");
     if (!acc[month]) acc[month] = [];
     acc[month].push(meeting);
     return acc;
   }, {} as Record<string, MeetingDetail[]>);
 
   // Sort months (newest first)
   const sortedMonths = Object.keys(meetingsByMonth).sort((a, b) => b.localeCompare(a));
 
   const getSentimentColor = (sentiment: string) => {
     switch (sentiment) {
       case "positive": return "bg-primary";
       case "negative": return "bg-destructive";
       default: return "bg-muted-foreground";
     }
   };
 
   const getSentimentBorderColor = (sentiment: string) => {
     switch (sentiment) {
       case "positive": return "border-l-primary";
       case "negative": return "border-l-destructive";
       default: return "border-l-muted-foreground";
     }
   };
 
   const toggleMonth = (month: string) => {
     setOpenMonths(prev => ({ ...prev, [month]: !prev[month] }));
   };
 
   const getMonthlySummary = (month: string) => {
     return monthlySummaries.find(s => s.month === month);
   };
 
   return (
     <div className="space-y-4">
       {sortedMonths.map(month => {
         const monthMeetings = meetingsByMonth[month];
         const summary = getMonthlySummary(month);
         const isOpen = openMonths[month] ?? true; // Default open
         const monthLabel = format(parseISO(`${month}-01`), "MMMM yyyy");
 
         // Count sentiments
         const sentimentCounts = monthMeetings.reduce((acc, m) => {
           acc[m.sentiment] = (acc[m.sentiment] || 0) + 1;
           return acc;
         }, {} as Record<string, number>);
 
         return (
           <Collapsible
             key={month}
             open={isOpen}
             onOpenChange={() => toggleMonth(month)}
           >
             <CollapsibleTrigger asChild>
               <Button
                 variant="ghost"
                 className="w-full justify-between p-4 h-auto bg-card hover:bg-accent border border-border/50 rounded-lg"
               >
                 <div className="flex items-center gap-3">
                   <ChevronDown
                     className={cn(
                       "h-4 w-4 transition-transform",
                       isOpen ? "rotate-0" : "-rotate-90"
                     )}
                   />
                   <span className="font-semibold">{monthLabel}</span>
                   <Badge variant="secondary">{monthMeetings.length} meetings</Badge>
                 </div>
                 <div className="flex items-center gap-2">
                   {sentimentCounts.positive > 0 && (
                     <span className="text-xs text-primary">🟢{sentimentCounts.positive}</span>
                   )}
                   {sentimentCounts.neutral > 0 && (
                     <span className="text-xs text-muted-foreground">⚪{sentimentCounts.neutral}</span>
                   )}
                   {sentimentCounts.negative > 0 && (
                     <span className="text-xs text-destructive">🔴{sentimentCounts.negative}</span>
                   )}
                 </div>
               </Button>
             </CollapsibleTrigger>
 
             <CollapsibleContent className="pt-2">
               <div className="relative pl-6">
                 {/* Timeline line */}
                 <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
 
                 <div className="space-y-3">
                   {monthMeetings
                     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                     .map(meeting => {
                       const externalCount = meeting.attendees.filter(a => !a.isInternal).length;
 
                       return (
                         <div key={meeting.id} className="relative">
                           {/* Timeline dot */}
                           <div
                             className={cn(
                               "absolute -left-3 top-4 w-2 h-2 rounded-full transform -translate-x-1/2",
                               getSentimentColor(meeting.sentiment)
                             )}
                           />
 
                           <Card
                             className={cn(
                               "border-l-4 cursor-pointer hover:bg-accent/50 transition-colors",
                               getSentimentBorderColor(meeting.sentiment)
                             )}
                             onClick={() => onMeetingClick(meeting)}
                           >
                             <CardContent className="p-4">
                               <div className="flex items-start justify-between gap-4">
                                 <div className="flex-1 min-w-0">
                                   <h4 className="font-medium text-sm truncate">
                                     {meeting.title}
                                   </h4>
                                   <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                     <span>{format(parseISO(meeting.date), "MMM d")}</span>
                                     <div className="flex items-center gap-1">
                                       <Clock className="h-3 w-3" />
                                       {meeting.duration}m
                                     </div>
                                     <div className="flex items-center gap-1">
                                       <Users className="h-3 w-3" />
                                       {externalCount} external
                                     </div>
                                     {meeting.actionItems.length > 0 && (
                                       <div className="flex items-center gap-1">
                                         <CheckCircle2 className="h-3 w-3" />
                                         {meeting.actionItems.length}
                                       </div>
                                     )}
                                   </div>
                                   <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                                     {meeting.summary}
                                   </p>
                                 </div>
                               </div>
                             </CardContent>
                           </Card>
                         </div>
                       );
                     })}
                 </div>
               </div>
             </CollapsibleContent>
           </Collapsible>
         );
       })}
     </div>
   );
 }