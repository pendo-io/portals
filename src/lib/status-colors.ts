// Lead status colors
const LEAD_STATUS_COLORS: Record<string, string> = {
  "New": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Open - Not Contacted": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Contacted": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Working - Contacted": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Nurturing": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Qualified": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Closed - Converted": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Closed - Not Converted": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Disqualified": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Rejected": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Approved": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Pending": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Not Submitted": "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300",
  "Submitted": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

// Opportunity stage colors
const OPP_STAGE_COLORS: Record<string, string> = {
  // Standard stages
  "Prospecting": "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300",
  "Qualification": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Needs Analysis": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Value Proposition": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Id. Decision Makers": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Perception Analysis": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Proposal": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Proposal/Price Quote": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Negotiation": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Negotiation/Review": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Closed Won": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Closed Lost": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  // Transaction types / deal types
  "New Subscription": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "New Business": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Expansion": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Renewal": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Upsell": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Cross-Sell": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Churn": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Disqualified": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Closed/Won": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Closed/Lost": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  // Stage numbers
  "Stage 0": "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300",
  "Stage 1": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Stage 2": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Stage 3": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Stage 4": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Stage 5": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Stage 6": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Stage 6: Closed/Won": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const FALLBACK = "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400";

export function getLeadStatusColor(status: string | null): string {
  if (!status) return FALLBACK;
  return LEAD_STATUS_COLORS[status] || "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
}

export function getOppStageColor(stage: string | null): string {
  if (!stage) return FALLBACK;
  return OPP_STAGE_COLORS[stage] || "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
}
