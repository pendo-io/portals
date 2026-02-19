 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Badge } from "@/components/ui/badge";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { 
   Calendar,
   Clock,
   Users,
   MessageSquare,
   CheckCircle2,
   TrendingUp,
   TrendingDown,
   Minus,
   Quote,
   Tag,
 } from "lucide-react";
 import { format, parseISO } from "date-fns";
 import { MeetingDetail } from "./types";
 
 interface AccountMeetingDetailDialogProps {
   meeting: MeetingDetail | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function AccountMeetingDetailDialog({ 
   meeting, 
   open, 
   onOpenChange 
 }: AccountMeetingDetailDialogProps) {
   if (!meeting) return null;
 
   const getSentimentIcon = (sentiment: string) => {
     switch (sentiment) {
       case "positive": return TrendingUp;
       case "negative": return TrendingDown;
       default: return Minus;
     }
   };
 
   const getSentimentColor = (sentiment: string) => {
     switch (sentiment) {
       case "positive": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
       case "negative": return "bg-red-500/20 text-red-400 border-red-500/30";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   const SentimentIcon = getSentimentIcon(meeting.sentiment);
   const externalAttendees = meeting.attendees.filter(a => !a.isInternal);
   const internalAttendees = meeting.attendees.filter(a => a.isInternal);
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-4xl max-h-[90vh]">
         <DialogHeader>
           <div className="flex items-start justify-between gap-4">
             <div>
               <DialogTitle className="text-xl">{meeting.title}</DialogTitle>
               <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                 <div className="flex items-center gap-1.5">
                   <Calendar className="h-4 w-4" />
                   <span>{format(parseISO(meeting.date), "EEEE, MMMM d, yyyy")}</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <Clock className="h-4 w-4" />
                   <span>{meeting.startTime} - {meeting.endTime}</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <span>{meeting.duration} min</span>
                 </div>
               </div>
             </div>
             <Badge className={getSentimentColor(meeting.sentiment)}>
               <SentimentIcon className="h-3 w-3 mr-1" />
               {meeting.sentiment}
             </Badge>
           </div>
         </DialogHeader>
 
         <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
           <div className="space-y-6">
             {/* Summary */}
             <Card>
               <CardHeader className="pb-3">
                 <CardTitle className="text-base flex items-center gap-2">
                   <MessageSquare className="h-4 w-4 text-primary" />
                   Summary
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                   {meeting.summary}
                 </p>
               </CardContent>
             </Card>
 
             {/* Key Topics */}
             {meeting.keyTopics.length > 0 && (
               <Card>
                 <CardHeader className="pb-3">
                   <CardTitle className="text-base flex items-center gap-2">
                     <Tag className="h-4 w-4 text-primary" />
                     Key Topics
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="flex flex-wrap gap-2">
                     {meeting.keyTopics.map((topic, idx) => (
                       <Badge key={idx} variant="secondary">{topic}</Badge>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             )}
 
             {/* Highlights */}
             {meeting.highlights.length > 0 && (
               <Card>
                 <CardHeader className="pb-3">
                   <CardTitle className="text-base flex items-center gap-2">
                     <Quote className="h-4 w-4 text-primary" />
                     Key Highlights
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-2">
                     {meeting.highlights.map((highlight, idx) => (
                       <div key={idx} className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary/50">
                         <p className="text-sm italic text-muted-foreground">"{highlight}"</p>
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             )}
 
             {/* Action Items */}
             {meeting.actionItems.length > 0 && (
               <Card>
                 <CardHeader className="pb-3">
                   <CardTitle className="text-base flex items-center gap-2">
                     <CheckCircle2 className="h-4 w-4 text-primary" />
                     Action Items
                     <Badge variant="secondary" className="ml-2">{meeting.actionItems.length}</Badge>
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     {meeting.actionItems.map((item, idx) => (
                       <div key={idx} className="p-3 rounded-lg border border-border/50 bg-card">
                         <div className="flex items-start justify-between gap-4">
                           <div className="flex-1">
                             <p className="text-sm font-medium">{item.task}</p>
                             <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                               <span>Owner: {item.owner}</span>
                               {item.dueDate && <span>Due: {item.dueDate}</span>}
                             </div>
                           </div>
                           <Badge 
                             variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "default" : "secondary"}
                           >
                             {item.priority}
                           </Badge>
                         </div>
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             )}
 
             {/* Attendees */}
             <Card>
               <CardHeader className="pb-3">
                 <CardTitle className="text-base flex items-center gap-2">
                   <Users className="h-4 w-4 text-primary" />
                   Attendees
                   <Badge variant="secondary" className="ml-2">{meeting.attendees.length}</Badge>
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="grid grid-cols-2 gap-6">
                   <div>
                    <h4 className="text-sm font-semibold mb-3 text-primary">External ({externalAttendees.length})</h4>
                     <div className="space-y-2">
                       {externalAttendees.map((attendee, idx) => (
                        <div key={idx} className="text-sm p-2 rounded bg-primary/10 border border-primary/20">
                           <div className="font-medium">{attendee.name}</div>
                           <div className="text-xs text-muted-foreground">{attendee.email}</div>
                         </div>
                       ))}
                     </div>
                   </div>
                   <div>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Internal ({internalAttendees.length})</h4>
                     <div className="space-y-2">
                       {internalAttendees.map((attendee, idx) => (
                        <div key={idx} className="text-sm p-2 rounded bg-muted/50 border border-border/50">
                           <div className="font-medium">{attendee.name}</div>
                           <div className="text-xs text-muted-foreground">{attendee.email}</div>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </div>
         </ScrollArea>
       </DialogContent>
     </Dialog>
   );
 }