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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

interface AccountInput {
  clientName: string;
  clientWebsite: string;
  salesforceId?: string;
  userName?: string;
  generatePodcast?: boolean;
}

interface CollectedSource {
  title: string;
  url: string;
  snippet?: string;
  query: string;
  type: "web" | "news";
  category: string;
  provider: "google" | "serper";
}

interface ApiUsage {
  openai: { calls: number; inputTokens: number; outputTokens: number };
  gemini: { calls: number; inputTokens: number; outputTokens: number };
  googleSearch: { calls: number; results: number };
  serper: { calls: number; results: number };
  embedding: { calls: number; tokens: number };
}

const COST_RATES = {
  openai: { inputPer1M: 2.50, outputPer1M: 10.00 },
  openaiTts: { per1MChars: 30.00 }, // tts-1-hd pricing
  gemini: { inputPer1M: 0.075, outputPer1M: 0.30 },
  googleSearch: { perCall: 0.005 },
  serper: { perCall: 0.001 },
  embedding: { per1M: 0.02 },
};

function calculateCosts(usage: ApiUsage) {
  const openaiCost = 
    (usage.openai.inputTokens / 1_000_000) * COST_RATES.openai.inputPer1M +
    (usage.openai.outputTokens / 1_000_000) * COST_RATES.openai.outputPer1M;
  
  const geminiCost = 
    (usage.gemini.inputTokens / 1_000_000) * COST_RATES.gemini.inputPer1M +
    (usage.gemini.outputTokens / 1_000_000) * COST_RATES.gemini.outputPer1M;
  
  const googleSearchCost = usage.googleSearch.calls * COST_RATES.googleSearch.perCall;
  const serperCost = usage.serper.calls * COST_RATES.serper.perCall;
  const embeddingCost = (usage.embedding.tokens / 1_000_000) * COST_RATES.embedding.per1M;
  
  return {
    openai: openaiCost,
    gemini: geminiCost,
    googleSearch: googleSearchCost,
    serper: serperCost,
    embedding: embeddingCost,
    total: openaiCost + geminiCost + googleSearchCost + serperCost + embeddingCost,
  };
}

const cleanUrl = (url: string) => url.replace(/[\s\)\]\}"',]+$/g, "").trim();

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

function isIrrelevantDomain(sourceDomain: string, clientDomain: string): boolean {
  if (sourceDomain.includes(clientDomain) || clientDomain.includes(sourceDomain.split('.')[0])) {
    return false;
  }
  const irrelevantPatterns = [
    /\.gov($|\.)/,
    /\.edu($|\.)/,
    /\.mil($|\.)/,
    /wikipedia\.org/,
    /\.state\.[a-z]{2}\.us/,
    /courts?\./,
    /senate\./,
    /congress\./,
    /university/,
    /\.ac\.[a-z]{2}/,
  ];
  return irrelevantPatterns.some(p => p.test(sourceDomain));
}

function isSourceRelevantToClient(
  source: CollectedSource,
  clientName: string,
  clientWebsite: string
): { isRelevant: boolean; relevanceScore: number } {
  const clientNameLower = clientName.toLowerCase().trim();
  const clientDomain = extractDomain(clientWebsite);
  const sourceTitleLower = (source.title || '').toLowerCase();
  const sourceSnippetLower = (source.snippet || '').toLowerCase();
  const sourceUrl = (source.url || '').toLowerCase();
  const sourceDomain = extractDomain(source.url || '');

  if (isIrrelevantDomain(sourceDomain, clientDomain)) {
    return { isRelevant: false, relevanceScore: 0 };
  }

  let score = 0;
  const clientDomainBase = clientDomain.split('.')[0];
  const sourceDomainBase = sourceDomain.split('.')[0];

  if (sourceDomain === clientDomain || sourceDomainBase === clientDomainBase) {
    score += 60;
  } else if (sourceDomain.includes(clientDomainBase) || clientDomain.includes(sourceDomainBase)) {
    score += 40;
  }

  const clientNameSlug = clientNameLower.replace(/\s+/g, '-');
  if (sourceUrl.includes(`/${clientNameSlug}`)) {
    score += 25;
  }

  const exactNamePattern = new RegExp(`\\b${clientNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (exactNamePattern.test(sourceTitleLower)) {
    score += 30;
  }

  if (exactNamePattern.test(sourceSnippetLower)) {
    score += 15;
  }

  const businessNewsDomains = ['techcrunch', 'forbes', 'bloomberg', 'reuters', 'wsj', 'businessinsider', 'venturebeat', 'crunchbase', 'linkedin'];
  const isBusinessNews = businessNewsDomains.some(d => sourceDomain.includes(d));
  if (isBusinessNews && exactNamePattern.test(sourceTitleLower + ' ' + sourceSnippetLower)) {
    score += 15;
  }

  const normalizedScore = Math.min(100, score);
  return {
    isRelevant: normalizedScore >= 35,
    relevanceScore: normalizedScore,
  };
}

function filterRelevantSources(
  sources: CollectedSource[],
  clientName: string,
  clientWebsite: string
): { validSources: CollectedSource[]; stats: { total: number; valid: number; filtered: number; avgScore: number } } {
  const validSources: CollectedSource[] = [];
  let totalScore = 0;
  let filteredCount = 0;

  for (const source of sources) {
    const { isRelevant, relevanceScore } = isSourceRelevantToClient(source, clientName, clientWebsite);
    if (isRelevant) {
      (source as any).relevanceScore = relevanceScore;
      validSources.push(source);
      totalScore += relevanceScore;
    } else {
      filteredCount++;
    }
  }

  return {
    validSources,
    stats: {
      total: sources.length,
      valid: validSources.length,
      filtered: filteredCount,
      avgScore: validSources.length > 0 ? Math.round(totalScore / validSources.length) : 0
    }
  };
}

async function serperSearch(
  query: string,
  serperApiKey: string,
  category: string,
  collector: CollectedSource[],
  usage: ApiUsage,
  searchType: "search" | "news" = "search",
): Promise<any[]> {
  try {
    const response = await fetch(`https://google.serper.dev/${searchType}`, {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });

    usage.serper.calls++;

    if (!response.ok) {
      console.error(`Serper ${searchType} error:`, response.status);
      return [];
    }

    const data = await response.json();
    const results = searchType === "news"
      ? (data.news || []).map((r: any) => ({ title: r.title, link: r.link, snippet: r.snippet }))
      : (data.organic || []).map((r: any) => ({ title: r.title, link: r.link, snippet: r.snippet }));

    usage.serper.results += results.length;

    for (const r of results) {
      if (r.link && r.title) {
        collector.push({
          title: r.title,
          url: cleanUrl(r.link),
          snippet: r.snippet,
          query,
          type: searchType === "news" ? "news" : "web",
          category,
          provider: "serper",
        });
      }
    }

    console.log(`[Serper ${searchType}] "${query}" => ${results.length} results`);
    return results;
  } catch (error) {
    console.error(`Serper ${searchType} error:`, error);
    return [];
  }
}

async function googleCseSearch(
  query: string,
  googleApiKey: string,
  googleCx: string,
  category: string,
  collector: CollectedSource[],
  usage: ApiUsage,
  opts?: { dateRestrict?: string; type?: "web" | "news" }
): Promise<any[]> {
  const type = opts?.type ?? "web";
  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", googleApiKey);
    url.searchParams.set("cx", googleCx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "10");
    if (opts?.dateRestrict) url.searchParams.set("dateRestrict", opts.dateRestrict);

    const response = await fetch(url.toString(), { method: "GET" });
    usage.googleSearch.calls++;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`Google CSE error (${response.status}) for query: ${query}`, body?.slice(0, 200));
      return [];
    }

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    usage.googleSearch.results += items.length;

    for (const it of items) {
      const title = it?.title;
      const link = it?.link;
      const snippet = it?.snippet;
      if (!title || !link) continue;
      collector.push({
        title: String(title),
        url: cleanUrl(String(link)),
        snippet: snippet ? String(snippet) : undefined,
        query,
        type,
        category,
        provider: "google",
      });
    }

    console.log(`[Google CSE] "${query}" => ${items.length} results`);
    return items;
  } catch (error) {
    console.error("Google CSE error:", error);
    return [];
  }
}

function buildUniqueFlatSources(sources: CollectedSource[]): { title: string; url: string }[] {
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  for (const s of sources) {
    const url = String(s?.url || "").trim();
    const title = String(s?.title || "").trim();
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
  }
  return out;
}

async function callGemini(prompt: string, systemPrompt: string, geminiApiKey: string, usage: ApiUsage): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  const inputTokenEstimate = Math.ceil((prompt.length + systemPrompt.length) / 4);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 6000,
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini error:", response.status, error);
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json();
    const outputContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    usage.gemini.calls++;
    usage.gemini.inputTokens += inputTokenEstimate;
    usage.gemini.outputTokens += Math.ceil(outputContent.length / 4);

    return outputContent;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseJsonFromText(text: string): any {
  const unwrapped = (() => {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return (jsonMatch ? jsonMatch[1] : text).trim();
  })();

  // 1) Direct parse
  try {
    return JSON.parse(unwrapped);
  } catch {
    // continue
  }

  // 2) Balanced JSON extraction (handles leading/trailing text)
  const balanced = extractBalancedJsonObject(unwrapped);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {
      // continue
    }
  }

  // 3) Last-ditch cleanup: replace smart quotes + strip trailing commas
  const cleaned = (balanced || unwrapped)
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
  const cleanedBalanced = extractBalancedJsonObject(cleaned) || cleaned;
  try {
    return JSON.parse(cleanedBalanced);
  } catch {
    // continue
  }

  // 4) Attempt to close truncated JSON by appending missing braces/brackets
  const base = cleanedBalanced || cleaned;
  let openBraces = 0, openBrackets = 0;
  let inStr = false, esc = false;
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
    // Strip trailing comma before closing
    let patched = base.replace(/,\s*$/, '');
    // If we're inside a string value that was cut off, close it
    if (inStr) patched += '"';
    for (let i = 0; i < openBrackets; i++) patched += ']';
    for (let i = 0; i < openBraces; i++) patched += '}';
    try {
      return JSON.parse(patched);
    } catch {
      // continue
    }
  }

  return null;
}

function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\') {
      if (inString) escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    if (ch === '}') depth--;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  return null;
}

// =============== PODCAST GENERATION ===============

function cleanScriptForTTS(script: string): string {
  return script
    .replace(/[—–-]/g, ' ')           // Remove all dashes
    .replace(/[""'']/g, '')            // Remove all quotes
    .replace(/[!?;:]/g, '.')           // Replace with periods
    .replace(/\(.*?\)/g, '')           // Remove parentheses and content
    .replace(/\[.*?\]/g, '')           // Remove brackets
    .replace(/\*/g, '')                // Remove asterisks
    .replace(/#/g, '')                 // Remove hashtags
    .replace(/\n{3,}/g, '\n\n')        // Max 2 line breaks
    .replace(/\s+/g, ' ')              // Normalize spaces
    .replace(/\.{2,}/g, '.')           // Remove multiple periods
    .replace(/,{2,}/g, ',')            // Remove multiple commas
    .replace(/\s+\./g, '.')            // Fix spacing before periods
    .replace(/\s+,/g, ',')             // Fix spacing before commas
    .trim();
}

function truncateScript(script: string, maxChars: number = 3500): string {
  if (script.length <= maxChars) return script;
  
  let truncated = script.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > maxChars - 300) {
    truncated = truncated.substring(0, lastPeriod + 1);
  }
  
  // Add closing if cut off
  if (!truncated.toLowerCase().includes('go make it happen') && !truncated.toLowerCase().includes('go close')) {
    truncated += ' You are fully prepped and ready to go. Now go make it happen.';
  }
  
  return truncated;
}

async function fetchPendoUseCasesFromRAG(
  geminiApiKey: string,
  usage: ApiUsage,
  clientIndustry?: string,
  clientName?: string
): Promise<string> {
  try {
    const externalSupabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalSupabaseKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
    
    if (!externalSupabaseUrl || !externalSupabaseKey) {
      console.warn("External RAG database not configured");
      return "";
    }
    
    const externalSupabase = createClient(externalSupabaseUrl, externalSupabaseKey);
    
    // Build industry-specific queries based on client category
    const industryContext = clientIndustry || "technology software SaaS";
    const industryKeywords = industryContext.toLowerCase();
    
    // Determine relevant use case categories based on industry
    let useCaseCategories: string[] = [];
    if (industryKeywords.includes("healthcare") || industryKeywords.includes("health")) {
      useCaseCategories = ["healthcare compliance", "patient engagement", "clinical workflow"];
    } else if (industryKeywords.includes("fintech") || industryKeywords.includes("financial") || industryKeywords.includes("banking")) {
      useCaseCategories = ["financial services compliance", "customer onboarding", "fraud prevention"];
    } else if (industryKeywords.includes("retail") || industryKeywords.includes("ecommerce") || industryKeywords.includes("commerce")) {
      useCaseCategories = ["customer experience", "checkout optimization", "user retention"];
    } else if (industryKeywords.includes("hr") || industryKeywords.includes("human resources") || industryKeywords.includes("workforce")) {
      useCaseCategories = ["employee onboarding", "HR platform adoption", "workforce productivity"];
    } else if (industryKeywords.includes("education") || industryKeywords.includes("edtech") || industryKeywords.includes("learning")) {
      useCaseCategories = ["learning platform adoption", "student engagement", "course completion"];
    } else if (industryKeywords.includes("saas") || industryKeywords.includes("software") || industryKeywords.includes("platform")) {
      useCaseCategories = ["product adoption", "feature discovery", "user activation"];
    } else {
      useCaseCategories = ["digital transformation", "product analytics", "user engagement"];
    }
    
    // Query for Pendo use cases relevant to client's industry
    const ragQueries = [
      `Pendo ${useCaseCategories[0]} use cases and ROI metrics`,
      `Pendo ${useCaseCategories[1] || 'product adoption'} success stories`,
      `Pendo ${industryContext} customer value drivers and outcomes`,
      "Pendo competitive positioning vs WalkMe Amplitude Whatfix",
    ];
    
    console.log(`RAG queries for ${clientName || 'client'} (${industryContext}):`, ragQueries);
    
    const ragResults: string[] = [];
    
    for (const query of ragQueries) {
      // Generate embedding using Gemini
      const embeddingResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: query }] },
          }),
        }
      );
      
      if (!embeddingResponse.ok) continue;
      
      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.embedding?.values;
      if (!embedding) continue;
      
      usage.embedding.calls++;
      usage.embedding.tokens += query.split(" ").length * 2;
      
      // Search RAG database
      const { data: results } = await externalSupabase.rpc("search_documents", {
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.60, // Slightly lower threshold for broader matches
        match_count: 3,
      });
      
      if (results && results.length > 0) {
        for (const r of results) {
          ragResults.push(r.content.slice(0, 500));
        }
      }
    }
    
    return ragResults.slice(0, 6).join("\n\n");
  } catch (e) {
    console.warn("RAG fetch failed:", e);
    return "";
  }
}

async function generatePodcastScript(
  snapshotData: any,
  clientName: string,
  userName: string,
  geminiApiKey: string,
  usage: ApiUsage
): Promise<string> {
  const { companySnapshot, financials, recentNews, hiring, salesIntel, marketPosition } = snapshotData;
  
  // Fetch Pendo use cases from RAG - pass industry for relevant results
  const clientIndustry = companySnapshot?.industry || marketPosition?.segment || "technology software";
  const pendoUseCases = await fetchPendoUseCasesFromRAG(geminiApiKey, usage, clientIndustry, clientName);
  
  const systemPrompt = `You are an expert podcast script writer creating a 4-minute energized account brief for a Pendo sales professional.

CRITICAL RULES:
1. Use ONLY periods and commas for punctuation. No dashes, colons, semicolons, exclamation marks, or question marks.
2. Max 550 words total for approximately 4 minutes of speaking time.
3. No special characters, no quotes, no parentheses.
4. Write as if speaking naturally to a colleague who is about to walk into a sales meeting.
5. Simple sentences only, conversational tone.
6. Script should have max 3500 characters.
7. Clearly separate the COMPANY OVERVIEW from RECENT NEWS sections.`;

  const prompt = `Create an energized 4-minute podcast script for ${userName} about their upcoming ${clientName} meeting.

STRUCTURE THE PODCAST INTO TWO DISTINCT PARTS:

=== PART 1: COMPANY OVERVIEW (about 2 minutes) ===
Cover: who they are, what they do, size, financials, market position, and why this matters for Pendo.

=== PART 2: RECENT NEWS AND SIGNALS (about 2 minutes) ===
Cover: what has happened in the last 2 months, what this means for their priorities, and how to use this intel in your conversation.

COMPANY DATA:
- Name: ${clientName}
- Industry: ${companySnapshot?.industry || 'Technology'}
- Description: ${companySnapshot?.description || 'Software company'}
- Employees: ${companySnapshot?.employeeCount || 'Unknown'}
- Headquarters: ${companySnapshot?.headquarters || 'Unknown'}
- Founded: ${companySnapshot?.founded || 'Unknown'}
- Target Customers: ${marketPosition?.targetCustomers || 'Unknown'}

FINANCIALS:
- Revenue: ${financials?.annualRevenue || 'Unknown'}
- Revenue Growth: ${financials?.revenueGrowth || 'Unknown'}
- Funding: ${financials?.fundingTotal || 'Unknown'}
- Valuation: ${financials?.valuation || 'Unknown'}
- Public Status: ${financials?.isPublic ? 'Publicly traded' : 'Private company'}

HIRING SIGNALS:
- Actively Hiring: ${hiring?.isActivelyHiring ? 'Yes, actively hiring' : 'Moderate hiring'}
- Trend: ${hiring?.hiringTrend || 'Stable'}
- Hot Departments: ${hiring?.hotDepartments?.join(', ') || 'Engineering, Product'}

RECENT NEWS FROM LAST 2 MONTHS:
${recentNews?.slice(0, 7).map((n: any) => `- ${n.headline} (${n.sentiment}): ${n.summary}`).join('\n') || 'No major recent news'}

SALES INTELLIGENCE:
- Buying Signals: ${salesIntel?.buyingSignals?.join(', ') || 'Product adoption focus, digital transformation'}
- Potential Challenges: ${salesIntel?.potentialChallenges?.join(', ') || 'Budget cycles, existing vendor relationships'}
- Recommended Approach: ${salesIntel?.recommendedApproach || 'Lead with product analytics value'}

MARKET POSITION:
- Segment: ${marketPosition?.segment || 'Mid-market to Enterprise'}
- Key Differentiator: ${marketPosition?.differentiator || 'Unknown'}
- Main Competitors: ${marketPosition?.competitors?.join(', ') || 'Unknown'}

${pendoUseCases ? `PENDO USE CASES AND VALUE DRIVERS:\n${pendoUseCases}` : ''}

SCRIPT FORMAT:
1. GREETING (1 sentence): Hey ${userName}, here is your quick brief on ${clientName} before your meeting.

2. COMPANY OVERVIEW SECTION (about 8-10 sentences):
   - Start with: Alright, let me give you the overview first.
   - What the company does and their mission
   - Size, headquarters, and industry position
   - Financial health and growth trajectory
   - Why they are interesting for Pendo

3. TRANSITION (1 sentence): Now let me catch you up on what has been happening lately.

4. RECENT NEWS SECTION (about 8-10 sentences):
   - Recent announcements, funding, partnerships, or challenges from the last 2 months
   - What these news items signal about their priorities
   - Talking points you can reference in your conversation
   - How to leverage this intel

5. THE PENDO PLAY (4-5 sentences):
   - Top 2-3 value propositions for this specific account
   - How Pendo addresses their specific needs based on the intel

6. CLOSING (2 sentences): You are fully prepped and ready to go. Now go make it happen.

OUTPUT: Write the complete 4-minute podcast script following all rules. Return plain text only.`;

  const scriptResponse = await callGemini(prompt, systemPrompt, geminiApiKey, usage);
  const cleanedScript = cleanScriptForTTS(scriptResponse);
  return truncateScript(cleanedScript, 3500);
}

async function generatePodcastAudio(
  script: string,
  openaiApiKey: string
): Promise<ArrayBuffer> {
  console.log(`Generating TTS audio for ${script.length} characters...`);
  
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      voice: "coral",
      input: script,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI TTS error:", response.status, error);
    throw new Error(`TTS generation failed: ${response.status}`);
  }

  return await response.arrayBuffer();
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const serperApiKey = Deno.env.get("SERPER_API_KEY");
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    const googleCx = Deno.env.get("GOOGLE_CX");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Serper is optional (it may 403 depending on account/billing). Google CSE is the reliable baseline.
    if (!geminiApiKey || !googleApiKey || !googleCx) {
      throw new Error("Missing required API keys (Gemini, Google CSE)");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const body: AccountInput = await req.json();
    const { clientName, clientWebsite, salesforceId, userName, generatePodcast } = body;

    if (!clientName || !clientWebsite) {
      throw new Error("Client name and website are required");
    }

    console.log(`\n=== ACCOUNT SNAPSHOT: ${clientName} ===`);

    const sourceCollector: CollectedSource[] = [];
    const usage: ApiUsage = {
      openai: { calls: 0, inputTokens: 0, outputTokens: 0 },
      gemini: { calls: 0, inputTokens: 0, outputTokens: 0 },
      googleSearch: { calls: 0, results: 0 },
      serper: { calls: 0, results: 0 },
      embedding: { calls: 0, tokens: 0 },
    };

    // Optional: preflight Serper once to avoid spamming logs if it 403s
    let serperEnabled = false;
    if (serperApiKey) {
      try {
        const preflight = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: `${clientName} company`, num: 3 }),
        });
        usage.serper.calls++;
        if (preflight.ok) {
          serperEnabled = true;
        } else {
          console.warn(`Serper disabled (status ${preflight.status}) - using Google CSE only`);
        }
      } catch {
        console.warn("Serper preflight failed - using Google CSE only");
      }
    }

    // Comprehensive search queries for snapshot - much more extensive
    const searchQueries = [
      // Company basics - multiple angles
      { query: `${clientName} company overview about us`, category: "company" },
      { query: `${clientName} official website company description`, category: "company" },
      { query: `${clientName} founded history origin story`, category: "company" },
      { query: `${clientName} mission vision values`, category: "company" },
      { query: `${clientName} employees headquarters location offices`, category: "company" },
      { query: `${clientName} CEO founder leadership team executives`, category: "company" },
      { query: `${clientName} company size headcount workforce`, category: "company" },
      
      // Financials - deep research
      { query: `${clientName} revenue 2024 2025 annual`, category: "financials" },
      { query: `${clientName} ARR MRR annual recurring revenue`, category: "financials" },
      { query: `${clientName} funding raised total investment`, category: "financials" },
      { query: `${clientName} valuation funding round series`, category: "financials" },
      { query: `${clientName} investors VC venture capital`, category: "financials" },
      { query: `site:crunchbase.com ${clientName}`, category: "financials" },
      { query: `site:pitchbook.com ${clientName}`, category: "financials" },
      { query: `site:owler.com ${clientName} revenue`, category: "financials" },
      
      // Public/Private status
      { query: `${clientName} IPO stock ticker NASDAQ NYSE public company`, category: "status" },
      { query: `${clientName} private company funding round investors`, category: "status" },
      { query: `${clientName} SEC filing 10-K annual report`, category: "status" },
      
      // Recent news - last 2 months focus
      { query: `${clientName} news December 2025 January 2026 February 2026`, category: "news" },
      { query: `${clientName} announcement press release 2026`, category: "news" },
      { query: `${clientName} funding acquisition partnership 2026`, category: "news" },
      { query: `${clientName} product launch release 2026`, category: "news" },
      { query: `${clientName} CEO interview statement 2026`, category: "news" },
      { query: `${clientName} expansion growth 2026`, category: "news" },
      { query: `${clientName} layoffs restructuring 2025 2026`, category: "news" },
      
      // Market & Competition
      { query: `${clientName} competitors alternatives vs comparison`, category: "market" },
      { query: `${clientName} market share industry leader`, category: "market" },
      { query: `${clientName} target market customers clients`, category: "market" },
      { query: `${clientName} case study customer success story`, category: "market" },
      
      // Hiring & Jobs - comprehensive
      { query: `${clientName} careers jobs hiring now`, category: "hiring" },
      { query: `${clientName} open positions job openings 2025 2026`, category: "hiring" },
      { query: `site:${clientWebsite} careers jobs`, category: "hiring" },
      { query: `site:linkedin.com/company ${clientName} jobs`, category: "hiring" },
      { query: `site:greenhouse.io ${clientName}`, category: "hiring" },
      { query: `site:lever.co ${clientName}`, category: "hiring" },
      { query: `${clientName} engineering hiring software developers`, category: "hiring" },
      { query: `${clientName} sales hiring account executive`, category: "hiring" },
      { query: `${clientName} hiring trends growth layoffs`, category: "hiring" },
      { query: `${clientName} headcount change employee growth`, category: "hiring" },
      
      // Tech stack & product
      { query: `${clientName} technology stack platform product`, category: "technology" },
      { query: `${clientName} integrations API partners`, category: "technology" },
    ];

    // Run all searches in parallel for maximum coverage
    console.log(`Running ${searchQueries.length} search queries...`);
    const newsDateRestrict = "m2"; // last ~2 months
    await Promise.all([
      ...searchQueries.map((q) =>
        googleCseSearch(
          q.query,
          googleApiKey,
          googleCx,
          q.category,
          sourceCollector,
          usage,
          {
            dateRestrict: q.category === "news" ? newsDateRestrict : undefined,
            type: q.category === "news" ? "news" : "web",
          },
        ),
      ),

      // Extra focused news queries with explicit date restriction
      googleCseSearch(`${clientName} news`, googleApiKey, googleCx, "news", sourceCollector, usage, {
        dateRestrict: newsDateRestrict,
        type: "news",
      }),
      googleCseSearch(`${clientName} press release`, googleApiKey, googleCx, "news", sourceCollector, usage, {
        dateRestrict: newsDateRestrict,
        type: "news",
      }),
      googleCseSearch(`${clientName} hiring`, googleApiKey, googleCx, "hiring", sourceCollector, usage, {
        dateRestrict: newsDateRestrict,
        type: "web",
      }),

      // Optional Serper enrichment (only if preflight passed)
      ...(serperEnabled
        ? [
            ...searchQueries.map((q) => serperSearch(q.query, serperApiKey!, q.category, sourceCollector, usage)),
            serperSearch(`${clientName} news`, serperApiKey!, "news", sourceCollector, usage, "news"),
          ]
        : []),
    ]);

    // Filter relevant sources
    const { validSources, stats } = filterRelevantSources(sourceCollector, clientName, clientWebsite);
    console.log(`Source validation: ${stats.valid}/${stats.total} passed (avg score: ${stats.avgScore}%)`);

    // Compile research context with category organization
    const categorizedResearch: Record<string, string[]> = {};
    for (const s of validSources.slice(0, 60)) {
      if (!categorizedResearch[s.category]) categorizedResearch[s.category] = [];
      categorizedResearch[s.category].push(`- ${s.title}: ${s.snippet || ''}`);
    }
    
    const researchContext = Object.entries(categorizedResearch)
      .map(([cat, items]) => `=== ${cat.toUpperCase()} ===\n${items.join('\n')}`)
      .join('\n\n');

    // Generate snapshot with Gemini Flash (fast)
    const systemPrompt = `You are a B2B sales intelligence analyst creating a lean, executive-level account snapshot for ${clientName}.
Focus on actionable facts. Be concise. No fluff. Use bullet points.

CRITICAL RULES - NO "UNKNOWN" VALUES ALLOWED:
- NEVER use "Unknown", "N/A", "Not available", or empty strings for ANY field.
- If exact data is unavailable, you MUST provide a reasonable AI estimate based on company size, industry, and available signals. Mark estimates with "(est.)" suffix.
- Examples: Instead of "Unknown" for revenue, write "$50M-100M ARR (est.)". Instead of "Unknown" for employees, write "~200-500 (est.)".
- For hiring: ALWAYS infer hiring activity from company size and industry. A 500-person SaaS company is ALWAYS hiring somewhere. Estimate departments and openings.
- For sales intel: ALWAYS generate actionable buying signals and challenges based on the company profile, industry trends, and market position. Never leave empty.
- For market position: ALWAYS estimate segment, competitors (at least 3), and target customers based on their product and industry.

For recent news, focus on events from the LAST 2 MONTHS (December 2025, January 2026, February 2026).
IMPORTANT: Include 5-7 news items. Classify major positive events (big funding, acquisitions, major partnerships, awards) as "big_win" and major negative events (layoffs, lawsuits, CEO departures, security breaches) as "big_loss". Use "positive", "neutral", "negative" for regular news.
For hiring data, identify specific departments/roles being hired and overall hiring trends.
Return ONLY valid JSON matching the schema exactly.`;

    const prompt = `Generate a comprehensive Account Snapshot for ${clientName} (${clientWebsite}).

Research Data by Category:
${researchContext}

Return this exact JSON schema:
{
  "companySnapshot": {
    "companyName": "string - official company name",
    "description": "string - 2-3 sentence company description with key value proposition",
    "industry": "string - primary industry",
    "subIndustry": "string - specific market segment",
    "founded": "string - REQUIRED, estimate decade if unknown e.g. '~2015 (est.)'",
    "headquarters": "string - REQUIRED, estimate region if unknown e.g. 'San Francisco, CA (est.)'",
    "employeeCount": "string - REQUIRED, estimate range e.g. '200-500 (est.)' - NEVER 'Unknown'",
    "employeeGrowth": "string - REQUIRED, estimate e.g. '+10-15% YoY (est.)' or 'Stable' - NEVER 'Unknown'",
    "website": "${clientWebsite}"
  },
  "financials": {
    "isPublic": "boolean - true if publicly traded",
    "stockTicker": "string or null - e.g., 'NYSE: AAPL'",
    "annualRevenue": "string - REQUIRED, e.g., '$100M-250M' or '$1.2B (est.)' - NEVER 'Unknown'",
    "revenueGrowth": "string - REQUIRED, e.g., '+25% YoY' or '+10-20% YoY (est.)' - NEVER 'Unknown'",
    "fundingTotal": "string or null - total funding raised if private",
    "lastFundingRound": "string or null - e.g., 'Series D - $75M (Jan 2024)'",
    "valuation": "string or null - estimated valuation",
    "keyInvestors": ["string - top 3 investors if known"]
  },
  "recentNews": [
    {
      "headline": "string - news headline",
      "date": "string - specific date if available (e.g., 'Jan 15, 2026')",
      "sentiment": "big_win | positive | neutral | negative | big_loss",
      "summary": "string - 1-2 sentence summary with impact",
      "category": "string - e.g., 'Funding', 'Product', 'Partnership', 'Leadership', 'Expansion', 'Award', 'Layoff'"
    }
  ],
  "hiring": {
    "isActivelyHiring": "boolean - REQUIRED, default true for growing companies",
    "estimatedOpenings": "string - REQUIRED, e.g., '50-100 positions (est.)' - NEVER 'Unknown'. Estimate based on company size.",
    "hiringTrend": "growing | stable | contracting - NEVER 'unknown'. Estimate based on company trajectory.",
    "hotDepartments": ["string - REQUIRED, at least 2-3 departments. Estimate from industry norms if not found, e.g., 'Engineering', 'Sales', 'Customer Success'"],
    "notableRoles": ["string - REQUIRED, at least 2-3 roles. Estimate typical roles for company size/stage, e.g., 'Senior Product Manager', 'Enterprise AE'"],
    "hiringSignals": "string - REQUIRED, 2-3 sentences analyzing hiring patterns and what they indicate about company priorities. NEVER generic."
  },
  "marketPosition": {
    "segment": "string - REQUIRED, market segment e.g. 'Enterprise SaaS' - NEVER 'Unknown'",
    "competitors": ["string - REQUIRED, at least 3-5 competitors. Estimate from industry if not found."],
    "differentiator": "string - REQUIRED, key differentiator in 1-2 sentences. Infer from product/positioning.",
    "targetCustomers": "string - REQUIRED, ideal customer profile description. NEVER 'Unknown'."
  },
  "keyFacts": [
    "string - 8-10 quick bullet facts about the company"
  ],
  "salesIntel": {
    "buyingSignals": ["string - REQUIRED, 3-5 specific actionable signals. NEVER empty. Infer from company profile and industry trends."],
    "potentialChallenges": ["string - REQUIRED, 2-3 specific objections. NEVER empty. Infer from company size and market."],
    "recommendedApproach": "string - REQUIRED, 2-3 sentences with specific, tailored recommendation. NEVER generic."
  }
}`;

    let rawResponse = await callGemini(prompt, systemPrompt, geminiApiKey, usage);
    let snapshotData = parseJsonFromText(rawResponse);

    // If the model returns non-JSON (extra prose, incomplete braces), attempt one repair pass.
    if (!snapshotData) {
      console.warn("Initial JSON parse failed; attempting one repair pass...");
      const repairSystemPrompt = `You are a strict JSON formatter. Extract or rewrite the user's content into VALID JSON only. No commentary. No markdown.`;
      const repairPrompt = `Return ONLY valid JSON matching this schema exactly (no extra keys):\n\n${prompt.split('Return this exact JSON schema:')[1] || ''}\n\nCONTENT TO FIX:\n${rawResponse}`;
      const repaired = await callGemini(repairPrompt, repairSystemPrompt, geminiApiKey, usage);
      snapshotData = parseJsonFromText(repaired);
      rawResponse = repaired;
    }

    if (!snapshotData) {
      console.error("Failed to parse AI response after repair attempt. First 500 chars:", rawResponse.slice(0, 500));
      throw new Error("Failed to parse AI response");
    }

    // Post-processing: sanitize any remaining "Unknown" values with sensible defaults
    const sanitizeUnknown = (val: any, fallback: string) => {
      if (!val || typeof val !== 'string') return fallback;
      const lower = val.toLowerCase().trim();
      if (lower === 'unknown' || lower === 'n/a' || lower === 'not available' || lower === '') return fallback;
      return val;
    };

    if (snapshotData.companySnapshot) {
      const cs = snapshotData.companySnapshot;
      cs.employeeCount = sanitizeUnknown(cs.employeeCount, '~100-500 (est.)');
      cs.employeeGrowth = sanitizeUnknown(cs.employeeGrowth, 'Stable (est.)');
      cs.founded = sanitizeUnknown(cs.founded, '~2010s (est.)');
      cs.headquarters = sanitizeUnknown(cs.headquarters, 'United States (est.)');
      cs.industry = sanitizeUnknown(cs.industry, 'Technology');
    }

    if (snapshotData.financials) {
      const f = snapshotData.financials;
      f.annualRevenue = sanitizeUnknown(f.annualRevenue, '$10M-50M (est.)');
      f.revenueGrowth = sanitizeUnknown(f.revenueGrowth, '+10-20% YoY (est.)');
    }

    if (snapshotData.hiring) {
      const h = snapshotData.hiring;
      h.estimatedOpenings = sanitizeUnknown(h.estimatedOpenings, '20-50 positions (est.)');
      if (h.hiringTrend === 'unknown' || !h.hiringTrend) h.hiringTrend = 'stable';
      if (!h.hotDepartments || h.hotDepartments.length === 0) h.hotDepartments = ['Engineering', 'Sales', 'Product'];
      if (!h.notableRoles || h.notableRoles.length === 0) h.notableRoles = ['Software Engineer', 'Account Executive', 'Product Manager'];
      h.hiringSignals = sanitizeUnknown(h.hiringSignals, `Based on company size and industry, ${clientName} likely has steady hiring across core functions with emphasis on engineering and go-to-market roles.`);
      if (h.isActivelyHiring === undefined || h.isActivelyHiring === null) h.isActivelyHiring = true;
    } else {
      snapshotData.hiring = {
        isActivelyHiring: true,
        estimatedOpenings: '20-50 positions (est.)',
        hiringTrend: 'stable',
        hotDepartments: ['Engineering', 'Sales', 'Product'],
        notableRoles: ['Software Engineer', 'Account Executive', 'Product Manager'],
        hiringSignals: `Based on company size and industry, ${clientName} likely maintains active hiring across core functions.`,
      };
    }

    if (snapshotData.salesIntel) {
      const si = snapshotData.salesIntel;
      if (!si.buyingSignals || si.buyingSignals.length === 0) {
        si.buyingSignals = ['Digital transformation initiatives driving tool adoption', 'Growth trajectory suggesting need for scalable solutions', 'Industry trends favoring product analytics adoption'];
      }
      if (!si.potentialChallenges || si.potentialChallenges.length === 0) {
        si.potentialChallenges = ['Existing vendor relationships may create switching costs', 'Budget approval cycles typical for company size'];
      }
      si.recommendedApproach = sanitizeUnknown(si.recommendedApproach, 'Lead with product analytics ROI, focusing on user adoption and feature discovery value props tailored to their industry.');
    } else {
      snapshotData.salesIntel = {
        buyingSignals: ['Digital transformation initiatives', 'Growth trajectory suggesting need for scalable solutions', 'Industry trends favoring product analytics'],
        potentialChallenges: ['Existing vendor relationships', 'Budget approval cycles'],
        recommendedApproach: 'Lead with product analytics ROI, focusing on user adoption and feature discovery.',
      };
    }

    if (snapshotData.marketPosition) {
      const mp = snapshotData.marketPosition;
      mp.segment = sanitizeUnknown(mp.segment, 'Mid-market to Enterprise (est.)');
      mp.targetCustomers = sanitizeUnknown(mp.targetCustomers, 'B2B organizations seeking digital product solutions (est.)');
      mp.differentiator = sanitizeUnknown(mp.differentiator, 'Differentiated positioning within their market segment.');
      if (!mp.competitors || mp.competitors.length === 0) mp.competitors = ['See industry analysis for competitor details'];
    } else {
      snapshotData.marketPosition = {
        segment: 'Mid-market to Enterprise (est.)',
        competitors: ['Industry competitors pending analysis'],
        differentiator: 'Differentiated positioning within their market segment.',
        targetCustomers: 'B2B organizations (est.)',
      };
    }

    // Build final report
    const flatSourcesAll = buildUniqueFlatSources(sourceCollector);
    const flatSourcesValid = buildUniqueFlatSources(validSources);

    const report = {
      ...snapshotData,
      metadata: {
        clientName,
        clientWebsite,
        salesforceId,
        generatedAt: new Date().toISOString(),
        generationTimeSeconds: Math.round((Date.now() - startTime) / 1000),
        sourceValidation: {
          total: stats.total,
          validated: stats.valid,
          averageRelevance: stats.avgScore,
        },
      },
      // Primary sources list used by Snapshot UI
      sources: validSources.slice(0, 80).map((s) => ({
        title: s.title,
        url: s.url,
        category: s.category,
      })),
      // Also include the standard metadata shape used by other report UIs/exports
      _metadata: {
        generatedAt: new Date().toISOString(),
        models: ["gemini-2.5-flash"],
        searchResults: {
          totalSources: flatSourcesAll.length,
          validatedSources: flatSourcesValid.length,
          googleCalls: usage.googleSearch.calls,
          serperCalls: usage.serper.calls,
        },
        flatSources: flatSourcesValid.slice(0, 250),
        relevanceScore: {
          score: stats.avgScore,
          level: stats.avgScore >= 70 ? "high" : stats.avgScore >= 40 ? "medium" : "low",
          explanation: `${stats.valid} of ${stats.total} sources validated with ${stats.avgScore}% average relevance.`,
          sourceValidation: {
            total: stats.total,
            validated: stats.valid,
            averageRelevance: stats.avgScore,
          },
        },
      },
    };

    // Generate podcast if requested
    let podcastBase64: string | null = null;
    let podcastScript: string | null = null;
    
    if (generatePodcast && openaiApiKey) {
      try {
        console.log("Generating podcast script...");
        const recipientName = userName || "Team Member";
        podcastScript = await generatePodcastScript(snapshotData, clientName, recipientName, geminiApiKey, usage);
        
        console.log(`Podcast script ready (${podcastScript.length} chars). Generating audio...`);
        const audioBuffer = await generatePodcastAudio(podcastScript, openaiApiKey);
        
        // Convert to base64 for transport
        const uint8Array = new Uint8Array(audioBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        podcastBase64 = btoa(binary);
        
        console.log(`Podcast audio generated: ${Math.round(audioBuffer.byteLength / 1024)} KB`);
        usage.openai.calls++;
      } catch (podcastError) {
        console.error("Podcast generation failed:", podcastError);
        // Continue without podcast - don't fail the whole request
      }
    }

    // Add podcast to report if generated
    const reportWithPodcast = {
      ...report,
      podcast: podcastBase64 ? {
        audioBase64: podcastBase64,
        script: podcastScript,
        generatedAt: new Date().toISOString(),
        voice: "coral",
        model: "tts-1-hd",
      } : null,
    };

    // Save to database
    const { data: savedReport, error: saveError } = await supabase
      .from("account_intelligence_reports")
      .insert({
        user_id: user.id,
        client_name: clientName,
        client_website: clientWebsite,
        salesforce_id: salesforceId || null,
        report_type: "snapshot",
        report_data: reportWithPodcast,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Failed to save report:", saveError);
    }

    // Save usage stats
    const costs = calculateCosts(usage);
    await supabase.from("account_intelligence_usage").insert({
      report_id: savedReport?.id || null,
      user_id: user.id,
      client_name: clientName,
      report_type: "snapshot",
      openai_calls: usage.openai.calls,
      openai_input_tokens: usage.openai.inputTokens,
      openai_output_tokens: usage.openai.outputTokens,
      openai_cost_usd: costs.openai,
      gemini_calls: usage.gemini.calls,
      gemini_input_tokens: usage.gemini.inputTokens,
      gemini_output_tokens: usage.gemini.outputTokens,
      gemini_cost_usd: costs.gemini,
      serper_calls: usage.serper.calls,
      serper_results: usage.serper.results,
      serper_cost_usd: costs.serper,
      google_search_calls: usage.googleSearch.calls,
      google_search_results: usage.googleSearch.results,
      google_search_cost_usd: costs.googleSearch,
      embedding_calls: usage.embedding.calls,
      embedding_tokens: usage.embedding.tokens,
      embedding_cost_usd: costs.embedding,
      total_cost_usd: costs.total,
      generation_time_seconds: Math.round((Date.now() - startTime) / 1000),
    });

    console.log(`\n=== SNAPSHOT COMPLETE in ${Math.round((Date.now() - startTime) / 1000)}s ===`);
    console.log(`Cost: $${costs.total.toFixed(4)}${podcastBase64 ? ' (includes podcast)' : ''}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        report: reportWithPodcast, 
        reportId: savedReport?.id,
        generationTime: Math.round((Date.now() - startTime) / 1000),
        hasPodcast: !!podcastBase64,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Account Snapshot error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
