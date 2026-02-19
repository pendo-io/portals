 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { 
   Target,
   AlertTriangle,
   TrendingUp,
   Shield,
   Zap,
 } from "lucide-react";
 import { OpportunityPick, RenewalConcern } from "./types";
 import { cn } from "@/lib/utils";
 
 interface OpportunityRenewalCardsProps {
   opportunities: OpportunityPick[];
   concerns: RenewalConcern[];
 }
 
 export function OpportunityRenewalCards({ opportunities, concerns }: OpportunityRenewalCardsProps) {
   const getValueColor = (value: string) => {
     switch (value) {
       case "high": return "bg-primary/20 text-primary";
       case "medium": return "bg-blue-500/20 text-blue-600";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   const getSeverityColor = (severity: string) => {
     switch (severity) {
       case "critical": return "bg-destructive/20 text-destructive border-destructive/30";
       case "moderate": return "bg-amber-500/20 text-amber-600 border-amber-500/30";
       default: return "bg-muted text-muted-foreground border-border";
     }
   };
 
   const getSeverityIcon = (severity: string) => {
     switch (severity) {
       case "critical": return "🔴";
       case "moderate": return "🟡";
       default: return "🟢";
     }
   };
 
   return (
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Opportunity Picks */}
       <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
         <CardHeader className="pb-3">
           <CardTitle className="text-base flex items-center gap-2">
             <Target className="h-5 w-5 text-primary" />
             Opportunity Picks
             {opportunities.length > 0 && (
               <Badge className="bg-primary/20 text-primary">{opportunities.length}</Badge>
             )}
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-3">
           {opportunities.length === 0 ? (
             <p className="text-sm text-muted-foreground">No specific opportunities identified yet.</p>
           ) : (
             opportunities.map((opp, i) => (
               <div key={i} className="p-3 rounded-lg bg-card border border-border/50 space-y-2">
                 <div className="flex items-start justify-between">
                   <div className="flex items-center gap-2">
                     <Zap className="h-4 w-4 text-primary" />
                     <span className="font-medium text-sm">{opp.title}</span>
                   </div>
                   <Badge className={cn("text-[10px]", getValueColor(opp.potentialValue))}>
                     {opp.potentialValue} value
                   </Badge>
                 </div>
                 
                 <p className="text-xs text-muted-foreground">{opp.description}</p>
                 
                 <div className="space-y-1">
                   <div className="text-xs font-medium">Signals:</div>
                   <ul className="text-xs text-muted-foreground">
                     {opp.signals.slice(0, 2).map((signal, j) => (
                       <li key={j} className="flex items-start gap-1.5">
                         <span className="text-primary shrink-0">•</span>
                         {signal}
                       </li>
                     ))}
                   </ul>
                 </div>
 
                 <div className="p-2 rounded bg-primary/10 text-xs">
                   <span className="font-medium">Approach: </span>
                   {opp.suggestedApproach}
                 </div>
               </div>
             ))
           )}
         </CardContent>
       </Card>
 
       {/* Renewal Concerns */}
       <Card className={cn(
         "border-border",
         concerns.some(c => c.severity === "critical") && "border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent"
       )}>
         <CardHeader className="pb-3">
           <CardTitle className="text-base flex items-center gap-2">
             <AlertTriangle className={cn(
               "h-5 w-5",
               concerns.some(c => c.severity === "critical") ? "text-destructive" : "text-amber-500"
             )} />
             Renewal Concerns
             {concerns.length > 0 && (
               <Badge className={cn(
                 concerns.some(c => c.severity === "critical") 
                   ? "bg-destructive/20 text-destructive" 
                   : "bg-amber-500/20 text-amber-600"
               )}>
                 {concerns.length}
               </Badge>
             )}
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-3">
           {concerns.length === 0 ? (
             <div className="flex items-center gap-2 text-sm text-primary">
               <Shield className="h-4 w-4" />
               No renewal concerns identified - looking good!
             </div>
           ) : (
             concerns.map((concern, i) => (
               <div key={i} className={cn(
                 "p-3 rounded-lg border space-y-2",
                 getSeverityColor(concern.severity)
               )}>
                 <div className="flex items-start justify-between">
                   <div className="flex items-center gap-2">
                     <span>{getSeverityIcon(concern.severity)}</span>
                     <span className="font-medium text-sm">{concern.concern}</span>
                   </div>
                   <Badge className={cn("text-[10px]", getSeverityColor(concern.severity))}>
                     {concern.severity}
                   </Badge>
                 </div>
 
                 <div className="space-y-1">
                   <div className="text-xs font-medium">Evidence:</div>
                   <ul className="text-xs text-muted-foreground">
                     {concern.evidence.slice(0, 2).map((ev, j) => (
                       <li key={j} className="flex items-start gap-1.5">
                         <span className="text-destructive shrink-0">•</span>
                         {ev}
                       </li>
                     ))}
                   </ul>
                 </div>
 
                 <div className="p-2 rounded bg-card/50 text-xs border border-border/50">
                   <span className="font-medium">Mitigation: </span>
                   {concern.mitigationStrategy}
                 </div>
               </div>
             ))
           )}
         </CardContent>
       </Card>
     </div>
   );
 }