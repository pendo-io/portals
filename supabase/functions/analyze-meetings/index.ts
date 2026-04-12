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

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  host?: { email: string; name: string };
  attendees?: Array<{ name: string; email: string; isInternal: boolean }>;
  transcript?: { entries: Array<{ speaker: { name: string }; text: string }> };
  salesforceAccountId?: string;
  salesforceOpportunityId?: string;
}

interface AnalyzedMeeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  attendees: string[];
  externalAttendees: string[];
  summary: string;
  actionItems: Array<{
    task: string;
    owner: string;
    priority: "high" | "medium" | "low";
    dueDate?: string;
  }>;
  keyTopics: string[];
  sentiment: "positive" | "neutral" | "negative";
  salesforceAccountId?: string;
  keyDecisions?: string[];
  risks?: string[];
  nextMeetingSuggestion?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { meetings } = await req.json() as { meetings: Meeting[] };

    if (!meetings || meetings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis: { meetings: [], weekSummary: null, totalActionItems: 0 } 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API keys
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI API keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyze meetings in parallel batches
    const analyzedMeetings: AnalyzedMeeting[] = [];
    const batchSize = 3;
    
    for (let i = 0; i < meetings.length; i += batchSize) {
      const batch = meetings.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((meeting, idx) => analyzeMeeting(
          meeting, 
          idx % 2 === 0 ? "openai" : "gemini",
          OPENAI_API_KEY,
          GEMINI_API_KEY
        ))
      );
      analyzedMeetings.push(...batchResults);
    }

    // Generate week summary using Gemini
    const weekSummaryResult = await generateWeekSummary(
      analyzedMeetings,
      GEMINI_API_KEY || OPENAI_API_KEY!,
      !!GEMINI_API_KEY
    );

    // Collect all action items with meeting context including external attendees for client extraction
    const allActionItems = analyzedMeetings.flatMap(m => 
      m.actionItems.map(a => ({ 
        ...a, 
        meetingTitle: m.title, 
        meetingDate: m.date,
        externalAttendees: m.externalAttendees,
        meetingSummary: m.summary
      }))
    );

    // Track usage (non-blocking)
    try {
      const generationTime = Math.round((Date.now() - startTime) / 1000);
      const openaiCalls = analyzedMeetings.filter((_, idx) => idx % 2 === 0).length + (GEMINI_API_KEY ? 0 : 1);
      const geminiCalls = analyzedMeetings.filter((_, idx) => idx % 2 !== 0).length + (GEMINI_API_KEY ? 1 : 0);
      const estimatedInputTokens = meetings.reduce((sum, m) => sum + (m.transcript?.entries?.length || 0) * 20 + 200, 0);
      const estimatedOutputTokens = analyzedMeetings.length * 300 + 400;
      const openaiCost = openaiCalls * (estimatedInputTokens / meetings.length * 0.00000015 + estimatedOutputTokens / analyzedMeetings.length * 0.0000006);
      const geminiCost = geminiCalls * 0.0001;
      await supabaseAdmin.from("account_intelligence_usage").insert({
        user_id: user!.id,
        client_name: "Weekly Analysis",
        report_type: "meeting_analysis",
        openai_calls: openaiCalls,
        openai_input_tokens: Math.round(estimatedInputTokens * (openaiCalls / (openaiCalls + geminiCalls || 1))),
        openai_output_tokens: Math.round(estimatedOutputTokens * (openaiCalls / (openaiCalls + geminiCalls || 1))),
        openai_cost_usd: Number(openaiCost.toFixed(4)),
        gemini_calls: geminiCalls,
        gemini_input_tokens: Math.round(estimatedInputTokens * (geminiCalls / (openaiCalls + geminiCalls || 1))),
        gemini_output_tokens: Math.round(estimatedOutputTokens * (geminiCalls / (openaiCalls + geminiCalls || 1))),
        gemini_cost_usd: Number(geminiCost.toFixed(4)),
        total_cost_usd: Number((openaiCost + geminiCost).toFixed(4)),
        generation_time_seconds: generationTime,
      });
    } catch (usageErr) {
      console.error("Usage tracking error (non-blocking):", usageErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          meetings: analyzedMeetings,
          weekSummary: weekSummaryResult.summary,
          topPriorities: weekSummaryResult.topPriorities,
          keyCommitments: weekSummaryResult.keyCommitments,
          totalActionItems: allActionItems.length,
          actionItemsByPriority: {
            high: allActionItems.filter(a => a.priority === "high"),
            medium: allActionItems.filter(a => a.priority === "medium"),
            low: allActionItems.filter(a => a.priority === "low"),
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing meetings:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function analyzeMeeting(
  meeting: Meeting,
  model: "openai" | "gemini",
  openaiKey?: string,
  geminiKey?: string
): Promise<AnalyzedMeeting> {
  const transcriptText = meeting.transcript?.entries
    ?.map(e => `${e.speaker?.name || 'Unknown'}: ${e.text}`)
    .join('\n') || '';

  const attendeeList = meeting.attendees?.map(a => a.name).join(', ') || '';
  const externalAttendees = meeting.attendees?.filter(a => !a.isInternal).map(a => a.email || a.name) || [];

  const prompt = `Analyze this meeting and extract key information.

Meeting Title: ${meeting.title}
Date: ${meeting.startTime}
Attendees: ${attendeeList}
${transcriptText ? `Transcript:\n${transcriptText.substring(0, 8000)}` : 'No transcript available'}

Provide analysis in this exact JSON format:
{
  "summary": "3-4 sentence summary of the meeting covering what was discussed, key outcomes, and next steps",
  "actionItems": [
    {"task": "specific action item", "owner": "person name", "priority": "high|medium|low", "dueDate": "YYYY-MM-DD or null"}
  ],
  "keyTopics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive|neutral|negative",
  "keyDecisions": ["decision 1", "decision 2"],
  "risks": ["risk or blocker 1", "risk or blocker 2"],
  "nextMeetingSuggestion": "recommended follow-up meeting or next step"
}

IMPORTANT for actionItems:
- Extract any mentioned deadlines, commitment dates, or timeframes for dueDate.
- If someone says "by Friday", "next week", "end of month", "by Q2", convert to an actual YYYY-MM-DD date relative to the meeting date ${meeting.startTime}.
- If no date is mentioned or implied, set dueDate to null.
- Be specific about who owns each action item.

For keyDecisions: List any decisions that were made or agreed upon during the meeting.
For risks: List any risks, blockers, concerns, or unresolved issues raised.
For nextMeetingSuggestion: Suggest a follow-up meeting topic or recommended next step based on the discussion.

If no transcript is available, provide a basic summary based on the title and attendees.`;

  try {
    let response: string;

    if (model === "openai" && openaiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a meeting analyst. Return only valid JSON." },
            { role: "user", content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });
      const data = await res.json();
      response = data.choices?.[0]?.message?.content || '{}';
    } else if (geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
        }),
      });
      const data = await res.json();
      response = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } else {
      throw new Error("No AI API key available");
    }

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const startDate = new Date(meeting.startTime);
    const endDate = new Date(meeting.endTime);
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    return {
      id: meeting.id,
      title: meeting.title,
      date: startDate.toISOString().split('T')[0],
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      duration: durationMinutes,
      attendees: meeting.attendees?.map(a => a.name) || [],
      externalAttendees: externalAttendees.map(a => a),
      summary: parsed.summary || `Meeting: ${meeting.title}`,
      actionItems: parsed.actionItems || [],
      keyTopics: parsed.keyTopics || [],
      sentiment: parsed.sentiment || "neutral",
      salesforceAccountId: meeting.salesforceAccountId,
      keyDecisions: parsed.keyDecisions || [],
      risks: parsed.risks || [],
      nextMeetingSuggestion: parsed.nextMeetingSuggestion || null,
    };
  } catch (error) {
    console.error(`Error analyzing meeting ${meeting.id}:`, error);
    const startDate = new Date(meeting.startTime);
    const endDate = new Date(meeting.endTime);
    
    return {
      id: meeting.id,
      title: meeting.title,
      date: startDate.toISOString().split('T')[0],
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      duration: Math.round((endDate.getTime() - startDate.getTime()) / 60000),
      attendees: meeting.attendees?.map(a => a.name) || [],
      externalAttendees: meeting.attendees?.filter(a => !a.isInternal).map(a => a.email || a.name) || [],
      summary: `Meeting: ${meeting.title}`,
      actionItems: [],
      keyTopics: [],
      sentiment: "neutral",
      salesforceAccountId: meeting.salesforceAccountId,
    };
  }
}

async function generateWeekSummary(
  meetings: AnalyzedMeeting[],
  apiKey: string,
  useGemini: boolean
): Promise<{ summary: string; topPriorities: string[]; keyCommitments: string[] }> {
  if (meetings.length === 0) return { summary: "No meetings this week.", topPriorities: [], keyCommitments: [] };

  const meetingSummaries = meetings.map(m => 
    `- ${m.title} (${m.date}): ${m.summary}. Actions: ${m.actionItems.length}`
  ).join('\n');

  const prompt = `Generate a weekly meeting summary for this person in JSON format.

Meetings this week:
${meetingSummaries}

Total meetings: ${meetings.length}
Total action items: ${meetings.reduce((sum, m) => sum + m.actionItems.length, 0)}

Return a JSON object with this exact format:
{
  "summary": "3-4 sentence executive summary highlighting key themes, most important action items, and overall productivity",
  "topPriorities": ["priority 1 for next week", "priority 2", "priority 3"],
  "keyCommitments": ["commitment made during meetings 1", "commitment 2"]
}

Be specific and actionable. Top priorities should be forward-looking tasks for the coming week. Key commitments are promises or agreements made during this week's meetings.`;

  try {
    let response: string;

    if (useGemini) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 800 },
        }),
      });
      const data = await res.json();
      response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
          temperature: 0.5,
        }),
      });
      const data = await res.json();
      response = data.choices?.[0]?.message?.content || '';
    }

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || response.trim() || "Weekly summary unavailable.",
          topPriorities: parsed.topPriorities || [],
          keyCommitments: parsed.keyCommitments || [],
        };
      } catch {
        return { summary: response.trim() || "Weekly summary unavailable.", topPriorities: [], keyCommitments: [] };
      }
    }
    return { summary: response.trim() || "Weekly summary unavailable.", topPriorities: [], keyCommitments: [] };
  } catch (error) {
    console.error("Error generating week summary:", error);
    return { summary: `This week: ${meetings.length} meetings with ${meetings.reduce((sum, m) => sum + m.actionItems.length, 0)} action items.`, topPriorities: [], keyCommitments: [] };
  }
}
