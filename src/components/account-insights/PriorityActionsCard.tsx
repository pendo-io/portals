 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { 
   Lightbulb,
   Clock,
   User,
   AlertCircle,
   CheckCircle2,
 } from "lucide-react";
 import { PriorityAction } from "./types";
 import { cn } from "@/lib/utils";
 import { format, parseISO } from "date-fns";
 
 interface PriorityActionsCardProps {
   actions: PriorityAction[];
   actionRecommendations: string[];
 }
 
 export function PriorityActionsCard({ actions, actionRecommendations }: PriorityActionsCardProps) {
   const getPriorityColor = (priority: string) => {
     switch (priority) {
       case "high": return "bg-destructive/20 text-destructive";
       case "medium": return "bg-amber-500/20 text-amber-600";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   return (
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
       {/* AI Recommended Next Steps */}
       <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
         <CardHeader className="pb-2">
           <CardTitle className="text-base flex items-center gap-2">
             <Lightbulb className="h-5 w-5 text-primary" />
             Recommended Next Steps
           </CardTitle>
         </CardHeader>
         <CardContent>
           {actionRecommendations.length === 0 ? (
             <p className="text-sm text-muted-foreground">No recommendations available.</p>
           ) : (
             <ol className="space-y-2">
               {actionRecommendations.map((rec, i) => (
                 <li key={i} className="flex items-start gap-2 text-sm">
                   <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                     {i + 1}
                   </span>
                   <span>{rec}</span>
                 </li>
               ))}
             </ol>
           )}
         </CardContent>
       </Card>
 
       {/* Priority Actions from Meetings */}
       <Card>
         <CardHeader className="pb-2">
           <CardTitle className="text-base flex items-center gap-2">
             <CheckCircle2 className="h-5 w-5 text-primary" />
             Priority Actions
             <Badge variant="secondary" className="text-xs">Last 2 Weeks</Badge>
           </CardTitle>
         </CardHeader>
         <CardContent>
           {actions.length === 0 ? (
             <p className="text-sm text-muted-foreground">No priority actions from recent meetings.</p>
           ) : (
             <div className="space-y-2 max-h-[300px] overflow-y-auto">
               {actions.map((action, i) => (
                 <div key={i} className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
                   <div className="flex items-start justify-between gap-2">
                     <span className="text-sm font-medium">{action.action}</span>
                     <Badge className={cn("text-[10px] shrink-0", getPriorityColor(action.priority))}>
                       {action.priority}
                     </Badge>
                   </div>
                   <div className="flex items-center gap-3 text-xs text-muted-foreground">
                     <span className="flex items-center gap-1">
                       <User className="h-3 w-3" />
                       {action.owner}
                     </span>
                     {action.dueDate && (
                       <span className="flex items-center gap-1">
                         <Clock className="h-3 w-3" />
                         {action.dueDate}
                       </span>
                     )}
                     <span className="truncate">
                       From: {action.context}
                     </span>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </CardContent>
       </Card>
     </div>
   );
 }