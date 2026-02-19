 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const RATE_LIMIT_MAX_CALLS = 50;
 const RATE_LIMIT_WINDOW_MINUTES = 60;
 const LOVABLE_API_KEY = () => Deno.env.get("LOVABLE_API_KEY");
 const AI_MODEL = "google/gemini-3-flash-preview";
 
 interface MeetingAttendee {
   name: string;
   email: string;
   isInternal: boolean;
 }
 
 interface ActionItem {
   task: string;
   owner: string;
   priority: "high" | "medium" | "low";
   dueDate?: string;
 }
 
 interface AdoptionSignals {
   newUsers: string[];
   existingUserGrowth: string[];
   productUsage: string[];
 }
 
 interface MeetingAnalysis {
   summary: string;
   keyTopics: string[];
   sentiment: "positive" | "neutral" | "negative";
   actionItems: ActionItem[];
   highlights: string[];
   problemsDiscussed: string[];
   problemsResolved: string[];
   adoptionSignals: AdoptionSignals;
 }
 
 interface ExecutiveAnalysis {
   executiveSummary: string;
   executiveContext: {
     relationshipHealth: string;
     engagementPattern: string;
     keyStakeholders: string[];
     criticalMoments: string[];
     nextSteps: string[];
   };
   productMentions: string[];
   adoptionSignals: string[];
   riskSignals: string[];
   opportunitySignals: string[];
   actionRecommendations: string[];
 }
 
 interface StakeholderAnalysis {
   name: string;
   email: string;
   role?: string;
   influence: "high" | "medium" | "low";
   sentiment: "positive" | "neutral" | "negative";
   engagementLevel: "active" | "moderate" | "low";
   lastMeetingDate?: string;
   approachSuggestion: string;
 }
 
 interface ChampionInfo {
   name: string;
   email: string;
   role?: string;
   championSignals: string[];
   recommendedAction: string;
 }
 
 interface OpportunityPick {
   title: string;
   description: string;
   potentialValue: "high" | "medium" | "low";
   signals: string[];
   suggestedApproach: string;
 }
 
 interface RenewalConcern {
   concern: string;
   severity: "critical" | "moderate" | "low";
   evidence: string[];
   mitigationStrategy: string;
 }
 
 interface PriorityAction {
   action: string;
   owner: string;
   priority: "high" | "medium" | "low";
   dueDate?: string;
   context: string;
   meetingDate: string;
 }
 
 interface StakeholderOpportunityAnalysis {
   stakeholders: StakeholderAnalysis[];
   champions: ChampionInfo[];
   opportunityPicks: OpportunityPick[];
   renewalConcerns: RenewalConcern[];
 }
 
 async function callAI(messages: { role: string; content: string }[]): Promise<string> {
   const apiKey = LOVABLE_API_KEY();
   if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
 
   const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
     method: "POST",
     headers: {
       Authorization: `Bearer ${apiKey}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       model: AI_MODEL,
       messages,
       temperature: 0.3,
     }),
   });
 
   if (!response.ok) {
     if (response.status === 429) throw new Error("429: Rate limit exceeded");
     if (response.status === 402) throw new Error("402: Payment required");
     const text = await response.text();
     throw new Error(`AI error ${response.status}: ${text}`);
   }
 
   const data = await response.json();
   return data.choices?.[0]?.message?.content || "";
 }
 
function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { if (inString) escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function parseJSON<T>(text: string): T | null {
  const unwrapped = (() => {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return (jsonMatch ? jsonMatch[1] : text).trim();
  })();

  // 1) Direct parse
  try { return JSON.parse(unwrapped) as T; } catch {}

  // 2) Balanced JSON extraction
  const balanced = extractBalancedJsonObject(unwrapped);
  if (balanced) {
    try { return JSON.parse(balanced) as T; } catch {}
  }

  // 3) Cleanup: smart quotes + trailing commas
  const cleaned = (balanced || unwrapped)
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
  const cleanedBalanced = extractBalancedJsonObject(cleaned) || cleaned;
  try { return JSON.parse(cleanedBalanced) as T; } catch {}

  // 4) Truncation recovery
  const base = cleanedBalanced || cleaned;
  let openBraces = 0, openBrackets = 0, inStr = false, esc = false;
  for (let i = 0; i < base.length; i++) {
    const c = base[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') openBraces++;
    else if (c === '}') openBraces--;
    else if (c === '[') openBrackets++;
    else if (c === ']') openBrackets--;
  }
  if (openBraces > 0 || openBrackets > 0) {
    let patched = base.replace(/,\s*$/, '');
    if (inStr) patched += '"';
    for (let i = 0; i < openBrackets; i++) patched += ']';
    for (let i = 0; i < openBraces; i++) patched += '}';
    try { return JSON.parse(patched) as T; } catch {}
  }

  return null;
}
 
 async function analyzeMeeting(meeting: any, internalDomain: string): Promise<MeetingAnalysis> {
   const attendees = (meeting.attendees || []).map((a: any) => {
     const email = a.emailAddress || a.email || "";
     const isInternal = email.includes(internalDomain);
     return `${a.displayName || a.name || email} (${isInternal ? "Internal" : "External"})`;
   }).join(", ");
 
  // Safely extract transcript/summary - handle both string and object types
  let rawTranscript = meeting.transcript || meeting.summary || "";
  if (typeof rawTranscript === "object") {
    rawTranscript = JSON.stringify(rawTranscript);
  }
  const transcript = String(rawTranscript).substring(0, 3000);
 
   const prompt = `Analyze this meeting and provide detailed insights:
 
 Meeting Title: ${meeting.title || meeting.subject}
 Date: ${meeting.startTime || meeting.date}
 Duration: ${Math.round((meeting.durationMinutes || meeting.duration || 30))} minutes
 Attendees: ${attendees}
 Transcript/Summary: ${transcript}
 
 Respond with JSON only:
 {
   "summary": "3-4 sentence detailed summary",
   "keyTopics": ["topic1", "topic2", "topic3"],
   "sentiment": "positive" | "neutral" | "negative",
   "actionItems": [
     {"task": "specific action", "owner": "person name", "priority": "high|medium|low", "dueDate": "optional date"}
   ],
   "highlights": ["key quote or important point"],
   "problemsDiscussed": ["any issues or blockers mentioned"],
   "problemsResolved": ["issues marked as fixed in this meeting"],
   "adoptionSignals": {
     "newUsers": ["new team members onboarded"],
     "existingUserGrowth": ["existing users expanding usage"],
     "productUsage": ["features discussed positively"]
   }
 }`;
 
   const result = await callAI([
     { role: "system", content: "You are an expert meeting analyst. Always respond with valid JSON only." },
     { role: "user", content: prompt },
   ]);
 
   const parsed = parseJSON<MeetingAnalysis>(result);
   return parsed || {
     summary: "Meeting analysis unavailable",
     keyTopics: [],
     sentiment: "neutral",
     actionItems: [],
     highlights: [],
     problemsDiscussed: [],
     problemsResolved: [],
     adoptionSignals: { newUsers: [], existingUserGrowth: [], productUsage: [] },
   };
 }
 
 async function generateExecutiveAnalysis(
   accountName: string,
   meetings: any[],
   accountData: any
 ): Promise<ExecutiveAnalysis> {
   const meetingSummaries = meetings.slice(0, 10).map(m => ({
     date: m.date,
     title: m.title,
     summary: m.summary,
     sentiment: m.sentiment,
     actionItems: m.actionItems?.length || 0,
   }));
 
   const sentimentCounts = meetings.reduce((acc, m) => {
     acc[m.sentiment] = (acc[m.sentiment] || 0) + 1;
     return acc;
   }, {} as Record<string, number>);
 
   const allStakeholders = new Set<string>();
   meetings.forEach(m => {
     (m.attendees || []).forEach((a: any) => {
       if (!a.isInternal && a.name) allStakeholders.add(a.name);
     });
   });
 
   const prompt = `Analyze the meeting history for customer "${accountName}":
 
 ACCOUNT DATA:
 - ARR: ${accountData?.arr || "Unknown"}
 - Renewal Date: ${accountData?.renewalDate || "Unknown"}
 - Health Score: ${accountData?.healthScore || "Unknown"}
 - Priority Tier: ${accountData?.priorityTier || "Unknown"}
 
 MEETINGS (${meetings.length} total):
 ${JSON.stringify(meetingSummaries, null, 2)}
 
 SENTIMENT BREAKDOWN: ${sentimentCounts.positive || 0} positive, ${sentimentCounts.neutral || 0} neutral, ${sentimentCounts.negative || 0} negative
 
 KEY STAKEHOLDERS: ${Array.from(allStakeholders).slice(0, 10).join(", ")}
 
 Provide executive analysis in JSON:
 {
   "executiveSummary": "4-5 sentence narrative with specific examples",
   "executiveContext": {
     "relationshipHealth": "Healthy/At Risk/Critical/Growing - with explanation",
     "engagementPattern": "How they typically engage",
     "keyStakeholders": ["Name - Role if known"],
     "criticalMoments": ["Key pivotal moment with date"],
     "nextSteps": ["Recommended next engagement"]
   },
   "productMentions": ["product or feature mentioned"],
   "adoptionSignals": ["positive adoption indicator with context"],
   "riskSignals": ["risk indicator with context"],
   "opportunitySignals": ["expansion opportunity with context"],
   "actionRecommendations": ["TODAY: Specific action", "THIS WEEK: Priority", "UPCOMING: Strategic"]
 }`;
 
   const result = await callAI([
     { role: "system", content: "You are a strategic customer success analyst. Respond with valid JSON only." },
     { role: "user", content: prompt },
   ]);
 
   const parsed = parseJSON<ExecutiveAnalysis>(result);
   return parsed || {
     executiveSummary: "Executive analysis unavailable",
     executiveContext: {
       relationshipHealth: "Unknown",
       engagementPattern: "Unknown",
       keyStakeholders: [],
       criticalMoments: [],
       nextSteps: [],
     },
     productMentions: [],
     adoptionSignals: [],
     riskSignals: [],
     opportunitySignals: [],
     actionRecommendations: [],
   };
 }
 
 async function generateStakeholderAnalysis(
   meetings: any[],
   internalDomain: string
 ): Promise<StakeholderOpportunityAnalysis> {
   // Build stakeholder data from meetings
   const stakeholderMap = new Map<string, any>();
   
   meetings.forEach(m => {
     (m.attendees || []).forEach((a: any) => {
       if (!a.isInternal && a.email) {
         const key = a.email.toLowerCase();
         if (!stakeholderMap.has(key)) {
           stakeholderMap.set(key, {
             name: a.name,
             email: a.email,
             meetings: [],
             sentiments: [],
           });
         }
         const s = stakeholderMap.get(key);
         s.meetings.push({ date: m.date, title: m.title, sentiment: m.sentiment });
         s.sentiments.push(m.sentiment);
       }
     });
   });
 
   const stakeholderData = Array.from(stakeholderMap.values())
     .sort((a, b) => b.meetings.length - a.meetings.length)
     .slice(0, 15);
 
   const prompt = `Analyze stakeholders for this customer account:
 
 STAKEHOLDERS (sorted by meeting frequency):
 ${JSON.stringify(stakeholderData, null, 2)}
 
 RECENT MEETINGS CONTEXT:
 ${JSON.stringify(meetings.slice(0, 10).map(m => ({
   date: m.date,
   title: m.title,
   sentiment: m.sentiment,
   summary: m.summary?.substring(0, 200),
   highlights: m.highlights?.slice(0, 2),
 })), null, 2)}
 
 Provide analysis in JSON:
 {
   "stakeholders": [
     {
       "name": "Full Name",
       "email": "email@company.com",
       "role": "Inferred role (Product Manager, VP Engineering, etc)",
       "influence": "high|medium|low",
       "sentiment": "positive|neutral|negative",
       "engagementLevel": "active|moderate|low",
       "lastMeetingDate": "YYYY-MM-DD",
       "approachSuggestion": "Specific way to engage this person effectively"
     }
   ],
   "champions": [
     {
       "name": "Champion Name",
       "email": "email@company.com",
       "role": "Role if known",
       "championSignals": ["Why this person is a champion - specific evidence"],
       "recommendedAction": "How to leverage this champion"
     }
   ],
   "opportunityPicks": [
     {
       "title": "Expansion Opportunity Title",
       "description": "What the opportunity is",
       "potentialValue": "high|medium|low",
       "signals": ["Evidence from meetings"],
       "suggestedApproach": "How to pursue this"
     }
   ],
   "renewalConcerns": [
     {
       "concern": "Specific renewal risk",
       "severity": "critical|moderate|low",
       "evidence": ["What was said/observed"],
       "mitigationStrategy": "How to address this"
     }
   ]
 }
 
 IMPORTANT:
 - Identify 1-3 champions who are actively advocating or moving things forward
 - List 2-4 concrete expansion/upsell opportunities with real evidence
 - Flag any renewal concerns based on negative sentiment, complaints, or disengagement
 - For each stakeholder, provide a SPECIFIC approach suggestion based on their behavior`;
 
   const result = await callAI([
     { role: "system", content: "You are an expert sales strategist. Analyze stakeholder dynamics and identify opportunities. Always respond with valid JSON only." },
     { role: "user", content: prompt },
   ]);
 
   const parsed = parseJSON<StakeholderOpportunityAnalysis>(result);
   return parsed || {
     stakeholders: [],
     champions: [],
     opportunityPicks: [],
     renewalConcerns: [],
   };
 }
 
 function extractPriorityActions(meetings: any[]): PriorityAction[] {
   const twoWeeksAgo = new Date();
   twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
 
   const recentMeetings = meetings.filter(m => new Date(m.date) >= twoWeeksAgo);
   
   const priorityActions: PriorityAction[] = [];
   
   recentMeetings.forEach(meeting => {
     (meeting.actionItems || []).forEach((item: any) => {
       if (item.priority === "high" || item.priority === "medium") {
         priorityActions.push({
           action: item.task,
           owner: item.owner,
           priority: item.priority,
           dueDate: item.dueDate,
           context: meeting.title,
           meetingDate: meeting.date,
         });
       }
     });
   });
 
   // Sort by priority then date
   return priorityActions
     .sort((a, b) => {
       if (a.priority === "high" && b.priority !== "high") return -1;
       if (b.priority === "high" && a.priority !== "high") return 1;
       return new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime();
     })
     .slice(0, 10);
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
    try {
      const startTime = Date.now();
      // Auth
      const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 
     const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } },
     });
     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
 
     const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
     if (userError || !user) {
       return new Response(JSON.stringify({ error: "Invalid token" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
      // Rate limit
     const { data: rateLimitOk } = await supabaseAdmin.rpc("check_api_rate_limit", {
       _user_id: user.id,
       _api_name: "account-insights",
       _max_calls: RATE_LIMIT_MAX_CALLS,
       _window_minutes: RATE_LIMIT_WINDOW_MINUTES,
     });
 
     if (!rateLimitOk) {
       return new Response(JSON.stringify({ 
         error: "Rate limit exceeded",
         message: `Maximum ${RATE_LIMIT_MAX_CALLS} calls per hour`
       }), {
         status: 429,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const body = await req.json();
     const { salesforceAccountId } = body;
 
     if (!salesforceAccountId) {
       return new Response(JSON.stringify({ error: "salesforceAccountId is required" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Audit log
     await supabaseAdmin.from("api_audit_log").insert({
       user_id: user.id,
       api_name: "account-insights",
       action: "analyze_account",
       request_params: { salesforceAccountId },
       ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
       user_agent: req.headers.get("user-agent"),
     });
 
     // Get Momentum API key
     const MOMENTUM_API_KEY = Deno.env.get("MOMENTUM_API_KEY");
     if (!MOMENTUM_API_KEY) {
       return new Response(JSON.stringify({ error: "MOMENTUM_API_KEY not configured" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Fetch 3 months of meetings from Momentum
     const threeMonthsAgo = new Date();
     threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
 
     const allMeetings: any[] = [];
     let page = 0;
     const maxPages = 20;
 
     while (page < maxPages) {
       const params = new URLSearchParams({
         salesforceAccountId: salesforceAccountId,
         from: threeMonthsAgo.toISOString(),
         to: new Date().toISOString(),
         pageSize: "50",
         page: String(page),
       });
 
       const response = await fetch(`https://api.momentum.io/v1/meetings?${params}`, {
         headers: { "X-API-Key": MOMENTUM_API_KEY },
       });
 
       if (!response.ok) {
         console.error("Momentum error:", response.status);
         break;
       }
 
       const data = await response.json();
       const meetings = data.meetings || [];
       allMeetings.push(...meetings);
 
       if (meetings.length < 50) break;
       page++;
     }
 
     if (allMeetings.length === 0) {
       return new Response(JSON.stringify({
         success: true,
         insights: {
           accountId: salesforceAccountId,
           accountName: "Unknown Account",
           accountCoreData: {},
           totalMeetings: 0,
           totalDuration: 0,
           sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
           overallSentiment: "neutral",
           keyTopics: [],
           meetingFrequency: "No meetings",
           engagementTrend: "stable",
           productMentions: [],
           adoptionSignals: [],
           riskSignals: [],
           opportunitySignals: [],
           meetings: [],
           monthlySummaries: [],
           executiveSummary: "No meetings found for this account in the last 3 months.",
           executiveContext: {
             relationshipHealth: "Unknown",
             engagementPattern: "No engagement",
             keyStakeholders: [],
             criticalMoments: [],
             nextSteps: [],
           },
           actionRecommendations: [],
         },
       }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Extract account name from first meeting
      // Try multiple possible field names from Momentum API
      const rawAccountName = allMeetings[0]?.externalAccountName || 
                             allMeetings[0]?.accountName || 
                             allMeetings[0]?.account?.name ||
                             allMeetings[0]?.company || 
                             allMeetings[0]?.companyName ||
                             null;
      
      // If no account name found, extract from meeting titles/content via AI
      let accountName = rawAccountName;
      if (!accountName || accountName === salesforceAccountId) {
        // Try to extract account name from meeting titles
        const meetingTitles = allMeetings.slice(0, 5).map((m: any) => m.title || m.subject || "").join("; ");
        try {
          const extractResponse = await callAI([
            {
              role: "system",
              content: "You are a data extraction assistant. Extract the company/account name from meeting titles. Return ONLY the company name, nothing else. If you cannot determine the company name, return 'Unknown'."
            },
            {
              role: "user",
              content: `Extract the customer company name from these meeting titles: ${meetingTitles}`
            }
          ]);
          const extractedName = extractResponse.trim().replace(/"/g, "");
          if (extractedName && extractedName.toLowerCase() !== "unknown" && extractedName.length < 100) {
            accountName = extractedName;
          } else {
            accountName = salesforceAccountId;
          }
        } catch {
          accountName = salesforceAccountId;
        }
      }
      
      // Fallback
      if (!accountName) {
        accountName =
                         salesforceAccountId;
      }
 
     // Determine internal domain (assume pendo.io for now)
     const internalDomain = "pendo.io";
 
     // Analyze meetings in parallel (10 at a time)
     const analyzedMeetings: any[] = [];
     const batchSize = 10;
 
     for (let i = 0; i < allMeetings.length; i += batchSize) {
       const batch = allMeetings.slice(i, i + batchSize);
       const analyses = await Promise.all(
         batch.map(async (meeting) => {
           const analysis = await analyzeMeeting(meeting, internalDomain);
           
           // Format attendees
           const attendees: MeetingAttendee[] = (meeting.attendees || []).map((a: any) => ({
             name: a.displayName || a.name || a.emailAddress || "Unknown",
             email: a.emailAddress || a.email || "",
             isInternal: (a.emailAddress || a.email || "").includes(internalDomain),
           }));
 
           const startTime = new Date(meeting.startTime || meeting.date);
           const endTime = new Date(meeting.endTime || meeting.date);
           const duration = meeting.durationMinutes || Math.round((endTime.getTime() - startTime.getTime()) / 60000) || 30;
 
           return {
             id: meeting.id || `${i}-${Math.random().toString(36).substr(2, 9)}`,
             title: meeting.title || meeting.subject || "Untitled Meeting",
             date: startTime.toISOString().split("T")[0],
             startTime: startTime.toTimeString().substring(0, 5),
             endTime: endTime.toTimeString().substring(0, 5),
             duration,
             attendees,
             ...analysis,
           };
         })
       );
       analyzedMeetings.push(...analyses);
     }
 
     // Generate monthly summaries
     const monthlyData: Record<string, any> = {};
     analyzedMeetings.forEach(m => {
       const month = m.date.substring(0, 7);
       if (!monthlyData[month]) {
         monthlyData[month] = {
           month,
           meetings: [],
           sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
           topics: [] as string[],
           highlights: [] as string[],
           problems: [] as string[],
           resolved: [] as string[],
           adoptionSignals: { newUsers: [] as string[], existingUserGrowth: [] as string[], productUsage: [] as string[] },
         };
       }
       monthlyData[month].meetings.push(m);
       monthlyData[month].sentimentBreakdown[m.sentiment]++;
       monthlyData[month].topics.push(...m.keyTopics);
       monthlyData[month].highlights.push(...m.highlights);
       monthlyData[month].problems.push(...(m.problemsDiscussed || []));
       monthlyData[month].resolved.push(...(m.problemsResolved || []));
       if (m.adoptionSignals) {
         monthlyData[month].adoptionSignals.newUsers.push(...m.adoptionSignals.newUsers);
         monthlyData[month].adoptionSignals.existingUserGrowth.push(...m.adoptionSignals.existingUserGrowth);
         monthlyData[month].adoptionSignals.productUsage.push(...m.adoptionSignals.productUsage);
       }
     });
 
     const monthlySummaries = Object.entries(monthlyData).map(([month, data]: [string, any]) => {
       const monthDate = new Date(`${month}-01`);
       const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
       
       // Determine overall mood
       const { positive, neutral, negative } = data.sentimentBreakdown;
       let overallMood: "positive" | "neutral" | "negative" = "neutral";
       if (positive > neutral && positive > negative) overallMood = "positive";
       else if (negative > positive && negative > neutral) overallMood = "negative";
 
       // Track open issues
       const openIssues = data.problems.filter((p: string) => 
         !data.resolved.some((r: string) => r.toLowerCase().includes(p.toLowerCase().substring(0, 20)))
       ).slice(0, 5);
 
       return {
         month,
         monthLabel,
         meetingCount: data.meetings.length,
         totalDuration: data.meetings.reduce((sum: number, m: any) => sum + m.duration, 0),
         sentimentBreakdown: data.sentimentBreakdown,
         topTopics: [...new Set(data.topics)].slice(0, 5),
         keyHighlights: data.highlights.slice(0, 3),
         overallMood,
         briefSummary: `${data.meetings.length} meetings with ${overallMood} overall sentiment.`,
         problemsIdentified: data.problems.slice(0, 5),
         problemsResolved: data.resolved.slice(0, 5),
         adoptionSignals: {
           newUsers: [...new Set(data.adoptionSignals.newUsers)].slice(0, 3),
           existingUserGrowth: [...new Set(data.adoptionSignals.existingUserGrowth)].slice(0, 3),
           productUsage: [...new Set(data.adoptionSignals.productUsage)].slice(0, 3),
         },
         openIssues,
       };
     }).sort((a, b) => a.month.localeCompare(b.month));
 
     // Calculate overall metrics
     const totalDuration = analyzedMeetings.reduce((sum, m) => sum + m.duration, 0);
     const sentimentBreakdown = analyzedMeetings.reduce((acc, m) => {
       acc[m.sentiment]++;
       return acc;
     }, { positive: 0, neutral: 0, negative: 0 });
 
     let overallSentiment: "positive" | "neutral" | "negative" = "neutral";
     if (sentimentBreakdown.positive > sentimentBreakdown.neutral && 
         sentimentBreakdown.positive > sentimentBreakdown.negative) {
       overallSentiment = "positive";
     } else if (sentimentBreakdown.negative > sentimentBreakdown.positive) {
       overallSentiment = "negative";
     }
 
     // Calculate meeting frequency
     const daySpan = 90;
     const avgPerWeek = (analyzedMeetings.length / (daySpan / 7)).toFixed(1);
     const meetingFrequency = `${avgPerWeek} per week`;
 
     // Determine engagement trend
     const sortedMonths = Object.keys(monthlyData).sort();
     let engagementTrend: "increasing" | "stable" | "decreasing" = "stable";
     if (sortedMonths.length >= 2) {
       const first = monthlyData[sortedMonths[0]]?.meetings?.length || 0;
       const last = monthlyData[sortedMonths[sortedMonths.length - 1]]?.meetings?.length || 0;
       if (last > first * 1.2) engagementTrend = "increasing";
       else if (last < first * 0.8) engagementTrend = "decreasing";
     }
 
     // All key topics
     const allTopics = analyzedMeetings.flatMap(m => m.keyTopics);
     const topicCounts = allTopics.reduce((acc, t) => {
       acc[t] = (acc[t] || 0) + 1;
       return acc;
     }, {} as Record<string, number>);
     const keyTopics = Object.entries(topicCounts)
       .sort((a, b) => b[1] - a[1])
       .slice(0, 10)
       .map(([topic]) => topic);
 
     // Generate executive analysis
      // Generate executive analysis and stakeholder analysis in parallel
      const [execAnalysis, stakeholderAnalysis] = await Promise.all([
        generateExecutiveAnalysis(accountName, analyzedMeetings, {}),
        generateStakeholderAnalysis(analyzedMeetings, internalDomain),
      ]);
 
      // Extract priority actions from recent meetings
      const recentPriorityActions = extractPriorityActions(analyzedMeetings);
 
     const insights = {
       accountId: salesforceAccountId,
       accountName,
       accountCoreData: {},
       totalMeetings: analyzedMeetings.length,
       totalDuration,
       sentimentBreakdown,
       overallSentiment,
       keyTopics,
       meetingFrequency,
       engagementTrend,
       productMentions: execAnalysis.productMentions,
       adoptionSignals: execAnalysis.adoptionSignals,
       riskSignals: execAnalysis.riskSignals,
       opportunitySignals: execAnalysis.opportunitySignals,
       meetings: analyzedMeetings,
       monthlySummaries,
       executiveSummary: execAnalysis.executiveSummary,
       executiveContext: execAnalysis.executiveContext,
       actionRecommendations: execAnalysis.actionRecommendations,
        stakeholders: stakeholderAnalysis.stakeholders,
        champions: stakeholderAnalysis.champions,
        opportunityPicks: stakeholderAnalysis.opportunityPicks,
        renewalConcerns: stakeholderAnalysis.renewalConcerns,
        recentPriorityActions,
     };
 
      // Track usage (non-blocking)
      try {
        const generationTime = Math.round((Date.now() - startTime) / 1000);
        // Individual meeting analyses + executive + stakeholder + possible name extraction = totalCalls
        const aiCalls = analyzedMeetings.length + 2 + (rawAccountName ? 0 : 1);
        const estimatedInputTokens = aiCalls * 1500;
        const estimatedOutputTokens = aiCalls * 500;
        const estimatedCost = aiCalls * 0.0001;
        await supabaseAdmin.from("account_intelligence_usage").insert({
          user_id: user.id,
          client_name: accountName || salesforceAccountId,
          report_type: "account_insights",
          gemini_calls: aiCalls,
          gemini_input_tokens: estimatedInputTokens,
          gemini_output_tokens: estimatedOutputTokens,
          gemini_cost_usd: Number(estimatedCost.toFixed(4)),
          total_cost_usd: Number(estimatedCost.toFixed(4)),
          generation_time_seconds: generationTime,
        });
      } catch (usageErr) {
        console.error("Usage tracking error (non-blocking):", usageErr);
      }

      // Update audit log with success status
      try {
        await supabaseAdmin.from("api_audit_log").insert({
          user_id: user.id,
          api_name: "account-insights",
          action: "analyze_account_SUCCESS",
          request_params: { salesforceAccountId },
          response_status: 200,
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
          user_agent: req.headers.get("user-agent"),
        });
      } catch {}

      return new Response(JSON.stringify({ success: true, insights }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
     console.error("Account insights error:", error);

     // Update audit log with error status
     try {
       const supabaseAdmin2 = createClient(
         Deno.env.get("SUPABASE_URL")!,
         Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
       );
       await supabaseAdmin2.from("api_audit_log").insert({
         user_id: "00000000-0000-0000-0000-000000000000",
         api_name: "account-insights",
         action: "analyze_account_ERROR",
         request_params: { error: error instanceof Error ? error.message : "Unknown error" },
         response_status: 500,
         ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
         user_agent: req.headers.get("user-agent"),
       });
     } catch {}

     return new Response(JSON.stringify({ 
       error: error instanceof Error ? error.message : "Unknown error" 
     }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });