 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const ALLOWED_ORIGINS = [
   Deno.env.get("ALLOWED_ORIGIN") ?? "https://pendoportals.vercel.app",
 ];

 function getCorsHeaders(req: Request): Record<string, string> {
   const origin = req.headers.get("origin") ?? "";
   return {
     "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
     "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
   };
 }
 
 const LOVABLE_API_KEY = () => Deno.env.get("LOVABLE_API_KEY");
 const AI_MODEL = "google/gemini-3-flash-preview";
 
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

  // 4) Truncation recovery: close unclosed braces/brackets
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
 
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
    try {
      const startTime = Date.now();
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
 
      // Any authenticated user can access
 
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
       api_name: "management-brief",
       action: "generate_brief",
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
 
     // Fetch 2 months of meetings
     const twoMonthsAgo = new Date();
     twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
 
     const allMeetings: any[] = [];
     let page = 0;
     const maxPages = 20;
 
     while (page < maxPages) {
       const params = new URLSearchParams({
         salesforceAccountId: salesforceAccountId,
         from: twoMonthsAgo.toISOString(),
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
 
     // Extract account name
     let accountName = salesforceAccountId;
     const rawAccountName = allMeetings[0]?.externalAccountName || 
                            allMeetings[0]?.accountName || 
                            allMeetings[0]?.account?.name ||
                            allMeetings[0]?.company || 
                            allMeetings[0]?.companyName ||
                            null;
     
     if (!rawAccountName) {
       const meetingTitles = allMeetings.slice(0, 5).map((m: any) => m.title || m.subject || "").join("; ");
       try {
         const extractResponse = await callAI([
           {
             role: "system",
             content: "Extract the company/account name from meeting titles. Return ONLY the company name, nothing else."
           },
           {
             role: "user",
             content: `Extract the customer company name: ${meetingTitles}`
           }
         ]);
         const extractedName = extractResponse.trim().replace(/"/g, "");
         if (extractedName && extractedName.toLowerCase() !== "unknown" && extractedName.length < 100) {
           accountName = extractedName;
         }
       } catch {}
     } else {
       accountName = rawAccountName;
     }
 
     const internalDomain = "pendo.io";
 
     // Build stakeholder map
     const stakeholderMap = new Map<string, any>();
     allMeetings.forEach((m: any) => {
       (m.attendees || []).forEach((a: any) => {
         const email = a.emailAddress || a.email || "";
         if (email && !email.includes(internalDomain)) {
           const key = email.toLowerCase();
           if (!stakeholderMap.has(key)) {
             stakeholderMap.set(key, {
               name: a.displayName || a.name || email.split("@")[0],
               email,
               meetings: [],
               sentiments: [],
               transcriptExcerpts: [],
             });
           }
           const s = stakeholderMap.get(key);
           s.meetings.push({ 
             date: m.startTime || m.date, 
             title: m.title || m.subject,
           });
         }
       });
     });
 
     // Calculate meeting stats
     const totalMeetings = allMeetings.length;
     let totalMinutes = 0;
     allMeetings.forEach((m: any) => {
       totalMinutes += m.durationMinutes || 30;
     });
 
     // Prepare meeting summaries for AI
     const meetingSummaries = allMeetings.slice(0, 20).map((m: any) => {
       let rawTranscript = m.transcript || m.summary || "";
       if (typeof rawTranscript === "object") {
         rawTranscript = JSON.stringify(rawTranscript);
       }
       return {
         title: m.title || m.subject || "Untitled",
         date: m.startTime || m.date,
         duration: m.durationMinutes || 30,
         attendees: (m.attendees || []).map((a: any) => ({
           name: a.displayName || a.name || "Unknown",
           email: a.emailAddress || a.email || "",
           isInternal: (a.emailAddress || a.email || "").includes(internalDomain),
         })),
         transcript: String(rawTranscript).substring(0, 2000),
       };
     });
 
     const stakeholderData = Array.from(stakeholderMap.values())
       .sort((a, b) => b.meetings.length - a.meetings.length)
       .slice(0, 15);
 
     // Generate comprehensive brief using AI
     const briefPrompt = `Generate a comprehensive Management Brief for customer "${accountName}":
 
 MEETING DATA (${totalMeetings} meetings, ${Math.round(totalMinutes / 60)} hours total over last 2 months):
 ${JSON.stringify(meetingSummaries, null, 2)}
 
 STAKEHOLDERS (${stakeholderData.length} external contacts):
 ${JSON.stringify(stakeholderData, null, 2)}
 
 Generate a detailed JSON response:
 {
   "overview": {
    "executiveNarrative": "10-15 sentence comprehensive executive summary. Start with the strategic relationship context. Detail the current engagement dynamics, key initiatives underway, decision-making patterns observed, and stakeholder alignment. Reference specific meetings, dates, and names. Conclude with the trajectory and what leadership needs to know. Be specific, use data points, and paint a complete picture of the account health and direction.",
    "executiveContext": "4-6 sentences providing deep situational awareness. What is the customer trying to achieve strategically? What business pressures are they facing? How does our solution fit into their broader digital transformation or business objectives? Reference specific conversations and initiatives mentioned.",
    "relationshipJourney": "3-5 sentences describing the evolution of the relationship over the 2-month period. How has engagement changed? Were there pivotal moments? Key turning points or inflection points in the relationship. Reference specific meetings and dates.",
    "currentState": "3-5 sentences on exactly where we stand right now. What's the nature of current discussions? What decisions are pending? What's the sentiment in recent conversations? What are stakeholders focused on today?",
    "futureDirection": "3-5 sentences on where this relationship is headed. What are the next milestones? What needs to happen for success? What's the realistic outlook for the next quarter based on current trajectory?",
     "accountHealth": "healthy|stable|at-risk|critical",
     "healthScore": 75,
    "healthRationale": "Detailed 3-5 sentence explanation of why this score was assigned. Reference specific signals, stakeholder behaviors, meeting outcomes, and trends that support this assessment. Be candid about both strengths and concerns.",
     "engagementLevel": "Description of engagement frequency and quality",
     "momentum": "accelerating|steady|slowing|stalled"
   },
  "useCaseFocus": [
    {
      "useCaseName": "Primary use case name being discussed/implemented",
      "description": "Comprehensive 4-6 sentence description of this use case. What problem does it solve for the customer? How does it fit into their workflow? What value does it deliver? Be specific about the context and application.",
      "currentStatus": "active|exploring|piloting|expanding|at-risk",
      "adoptionStage": "Where they are in the adoption journey (e.g., 'Early pilot with 3 teams', 'Full rollout across organization', 'Evaluation phase')",
      "keyStakeholders": ["Names of people driving or blocking this use case"],
      "successMetrics": ["Specific metrics they're tracking or outcomes they want to achieve"],
      "challenges": ["Specific challenges or blockers mentioned in meetings related to this use case"],
      "opportunities": ["Expansion or deepening opportunities identified"],
      "recommendedActions": ["Specific actions to take to advance this use case"],
      "timeline": "Expected or discussed timeline for this use case (e.g., 'Q1 pilot, Q2 expansion')",
      "businessValue": "Quantified or estimated business value/ROI for the customer"
    }
  ],
   "majorHighlights": [
     {
       "title": "Highlight title",
       "description": "What happened and why it matters",
       "date": "YYYY-MM-DD",
       "impact": "high|medium|low"
     }
   ],
   "bigWins": [
     {
       "title": "Win title",
       "description": "Details of the win",
       "date": "YYYY-MM-DD",
       "businessImpact": "Concrete business impact"
     }
   ],
   "mainIssues": [
     {
       "issue": "Issue name",
       "severity": "critical|high|medium",
       "description": "Full description of the issue",
       "evidence": ["Quote or observation 1", "Quote or observation 2"],
       "suggestedResolution": "How to address this",
       "status": "open|in-progress|resolved"
     }
   ],
   "stakeholderBreakdown": [
     {
       "name": "Full Name",
       "email": "email@company.com",
       "title": "Inferred job title",
       "department": "Department if known",
       "influence": "executive|decision-maker|influencer|user",
       "engagement": "highly-engaged|engaged|moderate|low|disengaged",
       "sentiment": "advocate|positive|neutral|skeptical|detractor",
       "meetingCount": 5,
       "lastSeen": "YYYY-MM-DD",
       "keyQuotes": ["Actual quote from transcript if available"],
       "concerns": ["Specific concern they raised"],
       "interests": ["Topics they're interested in"],
       "relationshipNotes": "Detailed notes about this person's role and behavior",
       "recommendedApproach": "Specific advice for engaging this person"
     }
   ],
   "sentimentAnalysis": {
     "overallScore": 7,
     "breakdown": { "positive": 60, "neutral": 30, "negative": 10 },
     "trendAnalysis": "Description of how sentiment is trending and why",
     "keyPositiveDrivers": ["What's driving positive sentiment"],
     "keyNegativeDrivers": ["What's causing concerns"],
     "sentimentByStakeholder": [
       { "name": "Person Name", "score": 8, "trend": "up|stable|down" }
     ]
   },
   "outlook": {
     "trajectory": "Where this relationship is heading and why",
     "nextSteps": ["Specific recommended action 1", "Action 2"],
     "risksToWatch": ["Risk 1", "Risk 2"],
     "opportunities": ["Opportunity 1", "Opportunity 2"]
   }
 }
 
 IMPORTANT GUIDELINES:
 - Be VERY detailed and comprehensive
 - Use actual names, dates, and specifics from the meetings
- The executiveNarrative should be 10-15 sentences minimum - paint the FULL picture
- The executiveContext, relationshipJourney, currentState, and futureDirection should each be 3-6 sentences
- Identify 1-3 USE CASES being discussed or implemented - be very detailed about each
 - Identify 3-5 major highlights worth mentioning
 - List 1-4 big wins (actual successes)
 - Identify TOP 3 issues (most important problems)
 - For EACH stakeholder, provide comprehensive analysis including quotes if available
 - Sentiment scores should be 1-10 scale
 - Be candid about risks and issues`;
 
     const briefResult = await callAI([
       { 
         role: "system", 
         content: "You are a senior customer success analyst creating a comprehensive management brief. Be detailed, specific, and actionable. Use real data from meetings. Respond with valid JSON only." 
       },
       { role: "user", content: briefPrompt },
     ]);
 
     const parsedBrief = parseJSON<any>(briefResult);
     
     if (!parsedBrief) {
       throw new Error("Failed to parse brief response");
     }
 
     const twoMonthsAgoStr = twoMonthsAgo.toLocaleDateString("en-US", { month: "short", year: "numeric" });
     const nowStr = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
 
     const brief = {
       accountId: salesforceAccountId,
       accountName,
       displayName: accountName,
       generatedAt: new Date().toISOString(),
       periodCovered: `${twoMonthsAgoStr} - ${nowStr}`,
       overview: parsedBrief.overview || {
         executiveNarrative: "Analysis unavailable",
         accountHealth: "stable",
         healthScore: 50,
         healthRationale: "Insufficient data",
         engagementLevel: "Unknown",
         momentum: "steady",
       },
      useCaseFocus: parsedBrief.useCaseFocus || [],
       meetingStats: {
         totalMeetings,
         totalHours: Math.round(totalMinutes / 60),
         averageSentiment: 0,
         sentimentTrend: "stable",
       },
       majorHighlights: parsedBrief.majorHighlights || [],
       bigWins: parsedBrief.bigWins || [],
       mainIssues: (parsedBrief.mainIssues || []).slice(0, 3),
       stakeholderBreakdown: parsedBrief.stakeholderBreakdown || [],
       sentimentAnalysis: parsedBrief.sentimentAnalysis || {
         overallScore: 5,
         breakdown: { positive: 33, neutral: 34, negative: 33 },
         trendAnalysis: "Insufficient data",
         keyPositiveDrivers: [],
         keyNegativeDrivers: [],
         sentimentByStakeholder: [],
       },
       outlook: parsedBrief.outlook || {
         trajectory: "Unknown",
         nextSteps: [],
         risksToWatch: [],
         opportunities: [],
       },
     };
 
      // Track usage (non-blocking)
      try {
        const generationTime = Math.round((Date.now() - startTime) / 1000);
        // 1 main brief call + possible name extraction
        const aiCalls = rawAccountName ? 1 : 2;
        const estimatedInputTokens = 3000 * aiCalls;
        const estimatedOutputTokens = 2000;
        const estimatedCost = aiCalls * 0.0002;
        await supabaseAdmin.from("account_intelligence_usage").insert({
          user_id: user.id,
          client_name: accountName || salesforceAccountId,
          report_type: "management_brief",
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
          api_name: "management-brief",
          action: "generate_brief_SUCCESS",
          request_params: { salesforceAccountId },
          response_status: 200,
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
          user_agent: req.headers.get("user-agent"),
        });
      } catch {}

      return new Response(JSON.stringify({ success: true, brief }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error: any) {
     console.error("Management brief error:", error);

     // Update audit log with error status
     try {
       const supabaseAdmin2 = createClient(
         Deno.env.get("SUPABASE_URL")!,
         Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
       );
       await supabaseAdmin2.from("api_audit_log").insert({
         user_id: "00000000-0000-0000-0000-000000000000",
         api_name: "management-brief",
         action: "generate_brief_ERROR",
         request_params: { error: error.message || "Unknown error" },
         response_status: 500,
         ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
         user_agent: req.headers.get("user-agent"),
       });
     } catch {}

     return new Response(JSON.stringify({ 
       success: false, 
       error: error.message || "Failed to generate brief" 
     }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });