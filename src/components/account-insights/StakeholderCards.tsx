 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { 
   Users, 
   Crown, 
   Mail, 
   TrendingUp, 
   MessageSquare,
   Star,
   AlertCircle,
 } from "lucide-react";
 import { StakeholderAnalysis, ChampionInfo } from "./types";
 import { cn } from "@/lib/utils";
 
 interface StakeholderCardsProps {
   stakeholders: StakeholderAnalysis[];
   champions: ChampionInfo[];
 }
 
 export function StakeholderCards({ stakeholders, champions }: StakeholderCardsProps) {
   const getSentimentColor = (sentiment: string) => {
     switch (sentiment) {
       case "positive": return "bg-primary/20 text-primary";
       case "negative": return "bg-destructive/20 text-destructive";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   const getInfluenceColor = (influence: string) => {
     switch (influence) {
       case "high": return "bg-amber-500/20 text-amber-600";
       case "medium": return "bg-blue-500/20 text-blue-600";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   const getEngagementColor = (level: string) => {
     switch (level) {
       case "active": return "text-primary";
       case "moderate": return "text-muted-foreground";
       default: return "text-destructive";
     }
   };
 
   return (
     <div className="space-y-6">
       {/* Champions Section */}
       {champions.length > 0 && (
         <div>
           <div className="flex items-center gap-2 mb-3">
             <Crown className="h-5 w-5 text-amber-500" />
             <h3 className="text-base font-semibold">Champions</h3>
             <Badge className="bg-amber-500/20 text-amber-600">Key Advocates</Badge>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
             {champions.map((champion, i) => (
               <Card key={i} className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
                 <CardContent className="pt-4 space-y-3">
                   <div className="flex items-start justify-between">
                     <div>
                       <div className="font-semibold flex items-center gap-1.5">
                         <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                         {champion.name}
                       </div>
                       {champion.role && (
                         <div className="text-xs text-muted-foreground">{champion.role}</div>
                       )}
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <Mail className="h-3 w-3" />
                     <span className="truncate">{champion.email}</span>
                   </div>
 
                   <div className="space-y-1">
                     <div className="text-xs font-medium">Champion Signals:</div>
                     <ul className="text-xs text-muted-foreground space-y-0.5">
                       {champion.championSignals.slice(0, 2).map((signal, j) => (
                         <li key={j} className="flex items-start gap-1.5">
                           <span className="text-amber-500 shrink-0">•</span>
                           <span className="line-clamp-2">{signal}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
 
                   <div className="p-2 rounded bg-amber-500/10 text-xs">
                     <span className="font-medium">Action: </span>
                     {champion.recommendedAction}
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
       )}
 
       {/* All Stakeholders */}
       {stakeholders.length > 0 && (
         <div>
           <div className="flex items-center gap-2 mb-3">
             <Users className="h-5 w-5 text-primary" />
             <h3 className="text-base font-semibold">Stakeholder Breakdown</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
             {stakeholders.map((stakeholder, i) => (
               <Card key={i} className="hover:border-primary/30 transition-colors">
                 <CardContent className="pt-4 space-y-2">
                   <div className="flex items-start justify-between">
                     <div>
                       <div className="font-medium text-sm">{stakeholder.name}</div>
                       {stakeholder.role && (
                         <div className="text-xs text-muted-foreground">{stakeholder.role}</div>
                       )}
                     </div>
                     <div className="flex gap-1">
                       <Badge className={cn("text-[10px] px-1.5", getInfluenceColor(stakeholder.influence))}>
                         {stakeholder.influence}
                       </Badge>
                       <Badge className={cn("text-[10px] px-1.5", getSentimentColor(stakeholder.sentiment))}>
                         {stakeholder.sentiment}
                       </Badge>
                     </div>
                   </div>
 
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <Mail className="h-3 w-3" />
                     <span className="truncate">{stakeholder.email}</span>
                   </div>
 
                   <div className="flex items-center gap-3 text-xs">
                     <span className={cn("flex items-center gap-1", getEngagementColor(stakeholder.engagementLevel))}>
                       <TrendingUp className="h-3 w-3" />
                       {stakeholder.engagementLevel}
                     </span>
                     {stakeholder.lastMeetingDate && (
                       <span className="text-muted-foreground">
                         Last: {stakeholder.lastMeetingDate}
                       </span>
                     )}
                   </div>
 
                   <div className="p-2 rounded bg-muted/50 text-xs flex items-start gap-1.5">
                     <MessageSquare className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                     <span>{stakeholder.approachSuggestion}</span>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
       )}
     </div>
   );
 }