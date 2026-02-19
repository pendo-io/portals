import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface OutreachInput {
  clientName: string;
  clientWebsite: string;
  salesforceId?: string;
  personas: string[]; // e.g., ["CEO", "CIO", "CRO"]
  contentFormat: "short" | "sequences" | "hooks";
}

interface UsageTracker {
  openai: { calls: number; inputTokens: number; outputTokens: number };
  gemini: { calls: number; inputTokens: number; outputTokens: number };
  googleSearch: { calls: number; results: number };
  serper: { calls: number; results: number };
  embedding: { calls: number; tokens: number };
}

type SourceType = "web" | "news";
type SourceProvider = "google" | "serper";

interface CollectedSource {
  title: string;
  url: string;
  snippet?: string;
  query: string;
  type: SourceType;
  category: string;
  provider: SourceProvider;
}

const cleanUrl = (url: string) => url.replace(/[\s\)\]\}"',]+$/g, "").trim();

// Extract domain from URL for matching
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

// Check if a domain is clearly unrelated (government, university, etc.)
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

// Check if snippet/title indicates this is about a company/product
function isAboutCompanyContext(text: string, clientName: string): boolean {
  const companyContextKeywords = [
    'company', 'platform', 'software', 'saas', 'product', 'solution', 'startup', 
    'enterprise', 'b2b', 'revenue', 'funding', 'valuation', 'ceo', 'founder',
    'customer', 'sales', 'partnership', 'acquisition', 'ipo', 'growth',
    'employee', 'headquarter', 'raised', 'series', 'investor', 'market',
    'pricing', 'feature', 'integration', 'api', 'technology', 'tech'
  ];
  
  const lowerText = text.toLowerCase();
  const clientLower = clientName.toLowerCase();
  
  if (lowerText.includes(clientLower)) {
    return companyContextKeywords.some(kw => lowerText.includes(kw));
  }
  
  return false;
}

// Validate if a source is relevant to the client - STRICT VERSION
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
  
  // STRICT CHECK 1: Reject clearly irrelevant domains
  if (isIrrelevantDomain(sourceDomain, clientDomain)) {
    return { isRelevant: false, relevanceScore: 0 };
  }
  
  let score = 0;
  
  // PRIORITY 1: Exact domain match (60 points)
  const clientDomainBase = clientDomain.split('.')[0];
  const sourceDomainBase = sourceDomain.split('.')[0];
  
  if (sourceDomain === clientDomain || sourceDomainBase === clientDomainBase) {
    score += 60;
  } else if (sourceDomain.includes(clientDomainBase) || clientDomain.includes(sourceDomainBase)) {
    score += 40;
  }
  
  // PRIORITY 2: URL path contains client name slug
  const clientNameSlug = clientNameLower.replace(/\s+/g, '-');
  const clientNameNoSpaces = clientNameLower.replace(/\s+/g, '');
  
  if (sourceUrl.includes(`/${clientNameSlug}`) || sourceUrl.includes(`/${clientNameNoSpaces}`)) {
    score += 25;
  }
  
  // PRIORITY 3: Title contains EXACT client name
  const exactNamePattern = new RegExp(`\\b${clientNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (exactNamePattern.test(sourceTitleLower)) {
    score += 30;
  }
  
  // PRIORITY 4: Snippet contains exact client name with company context
  if (exactNamePattern.test(sourceSnippetLower)) {
    if (isAboutCompanyContext(sourceSnippetLower, clientName)) {
      score += 25;
    } else {
      score += 10;
    }
  }
  
  // PRIORITY 5: Known business news sources
  const businessNewsDomains = ['techcrunch', 'forbes', 'bloomberg', 'reuters', 'wsj', 'businessinsider', 'venturebeat', 'crunchbase', 'linkedin', 'glassdoor', 'g2', 'capterra', 'trustradius'];
  const isBusinessNews = businessNewsDomains.some(d => sourceDomain.includes(d));
  
  if (isBusinessNews && exactNamePattern.test(sourceTitleLower + ' ' + sourceSnippetLower)) {
    score += 15;
  }
  
  const normalizedScore = Math.min(100, score);
  
  // STRICTER THRESHOLD: Require score >= 35
  return { isRelevant: normalizedScore >= 35, relevanceScore: normalizedScore };
}

// Filter sources to keep only those relevant to the client
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

// Calculate overall report confidence score
function calculateReportConfidence(
  sourceStats: { total: number; valid: number; avgScore: number },
  ragDocsCount: number
): { score: number; level: 'high' | 'medium' | 'low'; explanation: string } {
  const validationRatio = sourceStats.total > 0 ? (sourceStats.valid / sourceStats.total) : 0;
  let score = validationRatio * 50 + (sourceStats.avgScore / 100) * 30 + Math.min(1, sourceStats.valid / 30) * 10 + Math.min(1, ragDocsCount / 10) * 10;
  const roundedScore = Math.round(score);
  
  let level: 'high' | 'medium' | 'low';
  let explanation: string;
  
  if (roundedScore >= 70) {
    level = 'high';
    explanation = `High confidence: ${sourceStats.valid} verified sources with ${Math.round(validationRatio * 100)}% relevance rate.`;
  } else if (roundedScore >= 40) {
    level = 'medium';
    explanation = `Medium confidence: ${sourceStats.valid} of ${sourceStats.total} sources verified.`;
  } else {
    level = 'low';
    explanation = `Low confidence: Limited verified sources (${sourceStats.valid} of ${sourceStats.total}).`;
  }
  
  return { score: roundedScore, level, explanation };
}

// Persona-specific RAG queries for each role
const PERSONA_RAG_QUERIES: Record<string, string[]> = {
  CEO: [
    "CEO business growth revenue efficiency operational excellence digital transformation ROI",
    "executive leadership business outcomes productivity efficiency cost savings",
    "enterprise digital adoption platform CEO success stories ROI impact",
  ],
  CIO: [
    "CIO technology strategy digital transformation IT modernization software adoption",
    "CIO enterprise application consolidation technology ROI IT efficiency",
    "digital adoption platform CIO technology investment rationalization",
  ],
  CRO: [
    "CRO revenue operations sales enablement customer retention growth strategy",
    "revenue growth sales productivity customer success retention expansion",
    "product-led growth PLG revenue expansion customer onboarding conversion",
  ],
  CPO: [
    "CPO product strategy feature adoption user engagement product analytics",
    "product management feature prioritization user research product metrics NPS",
    "in-app guidance product analytics feature discovery user activation",
  ],
  CTO: [
    "CTO technical architecture platform scalability engineering productivity",
    "developer experience technology stack modernization technical debt reduction",
    "digital adoption engineering onboarding developer productivity tooling",
  ],
  COO: [
    "COO operational efficiency process optimization workflow automation",
    "operational excellence business process transformation efficiency gains",
    "employee productivity operational KPIs process streamlining adoption",
  ],
  "VP Product": [
    "VP Product feature adoption product-led growth user onboarding activation",
    "product management analytics feature usage discovery prioritization",
    "product analytics user engagement retention feature adoption metrics",
  ],
};

// Content format templates
const FORMAT_INSTRUCTIONS = {
  short: `Generate a SHORT, punchy outreach:
- Email: 2-3 paragraphs max, personalized opening, clear value prop, soft CTA
- LinkedIn: 280 characters max, attention-grabbing, conversational tone`,
  sequences: `Generate a FULL SEQUENCE:
- Email 1: Introduction/hook (2 paragraphs)
- Email 2: Value demonstration (3 paragraphs with specific examples)
- Email 3: Social proof + CTA (2 paragraphs)
- LinkedIn Connection Request: 300 chars max
- LinkedIn Follow-up Message: 500 chars max after connection`,
  hooks: `Generate PERSONALIZED HOOKS ONLY:
- 3 email subject lines that reference their specific situation
- 3 opening sentences that demonstrate research
- 3 value proposition one-liners tailored to their role
- 3 LinkedIn message openers (under 150 chars each)`,
};

async function googleCustomSearch(params: {
  query: string;
  googleApiKey: string;
  googleCx: string;
  category: string;
  type: SourceType;
  collector: CollectedSource[];
  dateRestrict?: string;
}): Promise<{ title: string; link: string; snippet?: string }[]> {
  const { query, googleApiKey, googleCx, category, type, collector, dateRestrict } = params;

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", googleApiKey);
    url.searchParams.set("cx", googleCx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "10");
    url.searchParams.set("safe", "active");
    if (dateRestrict) url.searchParams.set("dateRestrict", dateRestrict);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const txt = await res.text();
      console.error("Google Custom Search error:", res.status, txt);
      return [];
    }

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    const results = items
      .map((it: any) => ({
        title: String(it.title || ""),
        link: cleanUrl(String(it.link || "")),
        snippet: String(it.snippet || ""),
      }))
      .filter((r: any) => r.title && r.link);

    for (const r of results) {
      collector.push({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
        query,
        type,
        category,
        provider: "google",
      });
    }

    console.log(`[Google CSE] "${query}" => ${results.length} results`);
    return results;
  } catch (e) {
    console.error("Google Custom Search exception:", e);
    return [];
  }
}

async function serperSearch(
  query: string,
  serperApiKey: string,
  category: string,
  collector: CollectedSource[],
  searchType: "search" | "news" = "search"
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

    if (!response.ok) {
      console.error(`Serper ${searchType} error:`, response.status);
      return [];
    }

    const data = await response.json();
    const results =
      searchType === "news"
        ? (data.news || []).map((r: any) => ({ title: r.title, link: r.link, snippet: r.snippet }))
        : (data.organic || []).map((r: any) => ({ title: r.title, link: r.link, snippet: r.snippet }));

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

interface OpenAIResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

async function callOpenAI(prompt: string, systemPrompt: string, openaiApiKey: string): Promise<OpenAIResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 8000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI error:", response.status, error);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || "",
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

interface GeminiResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

async function callGemini(prompt: string, systemPrompt: string, geminiApiKey: string): Promise<GeminiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000,
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini error:", response.status, error);
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// RAG: Generate embedding using OpenAI text-embedding-3-small
async function generateEmbedding(text: string, openaiApiKey: string): Promise<number[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI embedding error:", response.status, error);
      return [];
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || [];
  } catch (e) {
    console.error("Embedding generation error:", e);
    return [];
  }
}

// RAG: Search documents table for relevant content
async function searchRAGDocuments(
  query: string,
  openaiApiKey: string,
  supabaseServiceClient: any,
  matchCount: number = 10
): Promise<{ id?: number; content: string; metadata: any; similarity: number }[]> {
  try {
    const embedding = await generateEmbedding(query, openaiApiKey);
    if (embedding.length === 0) {
      console.log("[RAG] No embedding generated, skipping search");
      return [];
    }

    console.log(`[RAG] Generated embedding for query: "${query.slice(0, 50)}..."`);

    const { data, error } = await supabaseServiceClient.rpc("match_documents", {
      filter: {},
      match_count: matchCount,
      query_embedding: embedding,
    });

    if (error) {
      console.error("[RAG] match_documents RPC error:", JSON.stringify(error));
      return [];
    }

    console.log(`[RAG] match_documents returned ${data?.length || 0} documents`);
    return data || [];
  } catch (e) {
    console.error("[RAG] Search exception:", e);
    return [];
  }
}

function parseAIResponse(content: string): any {
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) jsonStr = objectMatch[0];
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("[Parse] JSON parse failed:", e);
    return { rawContent: content };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    const googleCx = Deno.env.get("GOOGLE_CX");
    const serperApiKey = Deno.env.get("SERPER_API_KEY");
    const externalSupabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalSupabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

    if (!openaiApiKey || !geminiApiKey) {
      return new Response(JSON.stringify({ error: "Missing API_KEY configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // External Supabase for RAG
    let externalSupabase: any = null;
    if (externalSupabaseUrl && externalSupabaseServiceKey) {
      externalSupabase = createClient(externalSupabaseUrl, externalSupabaseServiceKey);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const body: OutreachInput = await req.json();
    const { clientName, clientWebsite, salesforceId, personas, contentFormat } = body;

    if (!clientName || !clientWebsite || !personas || personas.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`\n=== OUTREACH REPORT: ${clientName} ===`);
    console.log(`Personas: ${personas.join(", ")}`);
    console.log(`Format: ${contentFormat}`);

    const usage: UsageTracker = {
      openai: { calls: 0, inputTokens: 0, outputTokens: 0 },
      gemini: { calls: 0, inputTokens: 0, outputTokens: 0 },
      googleSearch: { calls: 0, results: 0 },
      serper: { calls: 0, results: 0 },
      embedding: { calls: 0, tokens: 0 },
    };

    const sourceCollector: CollectedSource[] = [];

    // Phase 1: Gather company research
    console.log("\n--- Phase 1: Company Research ---");

    const companyQueries = [
      `${clientName} company strategy priorities 2024 2025`,
      `${clientName} digital transformation technology investments`,
      `${clientName} CEO CIO executive priorities challenges`,
      `${clientName} site:linkedin.com executives leadership`,
    ];

    const searchPromises: Promise<any>[] = [];

    if (googleApiKey && googleCx) {
      for (const q of companyQueries) {
        searchPromises.push(
          googleCustomSearch({
            query: q,
            googleApiKey,
            googleCx,
            category: "company",
            type: "web",
            collector: sourceCollector,
          }).then((r) => {
            usage.googleSearch.calls++;
            usage.googleSearch.results += r.length;
            return r;
          })
        );
      }
    }

    if (serperApiKey) {
      for (const q of companyQueries) {
        searchPromises.push(
          serperSearch(q, serperApiKey, "company", sourceCollector).then((r) => {
            usage.serper.calls++;
            usage.serper.results += r.length;
            return r;
          })
        );
      }
    }

    await Promise.all(searchPromises);

    // Filter sources to keep only those relevant to the client
    console.log(`[Source Validation] Starting validation for ${sourceCollector.length} sources...`);
    const { validSources: validatedSources, stats: sourceValidationStats } = filterRelevantSources(
      sourceCollector,
      clientName,
      clientWebsite
    );
    console.log(`[Source Validation] Kept ${sourceValidationStats.valid} of ${sourceValidationStats.total} sources (filtered ${sourceValidationStats.filtered} irrelevant)`);
    
    // Calculate overall report confidence (no RAG count, just sources)
    const reportConfidence = calculateReportConfidence(sourceValidationStats, 0);
    console.log(`[Report Confidence] Score: ${reportConfidence.score}% (${reportConfidence.level})`);

    // Phase 2: RAG queries for each persona
    console.log("\n--- Phase 2: RAG Knowledge Retrieval ---");

    const ragResults: Record<string, string[]> = {};

    if (externalSupabase) {
      const ragPromises = personas.map(async (persona) => {
        const queries = PERSONA_RAG_QUERIES[persona] || [];
        const docs: string[] = [];

        for (const q of queries) {
          usage.embedding.calls++;
          usage.embedding.tokens += q.length;
          const results = await searchRAGDocuments(q, openaiApiKey, externalSupabase, 5);
          for (const doc of results) {
            if (doc.content) docs.push(doc.content);
          }
        }

        return { persona, docs };
      });

      const ragData = await Promise.all(ragPromises);
      for (const { persona, docs } of ragData) {
        ragResults[persona] = docs;
      }
    }

    // Phase 3: Generate outreach for each persona
    console.log("\n--- Phase 3: Generate Outreach Content ---");

    const researchSummary = validatedSources
      .slice(0, 30)
      .map((s) => `- ${s.title}: ${s.snippet || ""}`)
      .join("\n");

    const personaOutreach: Record<string, any> = {};

    const outreachPromises = personas.map(async (persona, idx) => {
      const ragContext = (ragResults[persona] || []).slice(0, 5).join("\n\n---\n\n");
      const useOpenAI = idx % 2 === 0;

      const systemPrompt = `You are an elite B2B sales copywriter specializing in executive outreach for enterprise SaaS.

You are writing outreach content for a ${persona} at ${clientName}.

CRITICAL REQUIREMENTS:
1. Reference specific company information from the research
2. Use the Pendo value propositions from the RAG knowledge base
3. Match the tone to the ${persona} role (strategic for CEO, technical for CTO, etc.)
4. Be specific, not generic - mention their company name and relevant details
5. Focus on business outcomes, not product features

${FORMAT_INSTRUCTIONS[contentFormat]}

Return ONLY valid JSON matching the schema below. Do not wrap with markdown.`;

      const prompt = `
## Company: ${clientName}
## Website: ${clientWebsite}
## Target Persona: ${persona}

## Company Research:
${researchSummary}

## Pendo Value Propositions (from knowledge base):
${ragContext || "No specific knowledge base content available - use general Pendo value props for this persona."}

Generate personalized ${contentFormat === "short" ? "email and LinkedIn message" : contentFormat === "sequences" ? "email sequence and LinkedIn messages" : "hooks and openers"} for this ${persona}.

Return JSON:
${
  contentFormat === "short"
    ? `{
  "persona": "${persona}",
  "email": {
    "subjectLine": "...",
    "body": "..."
  },
  "linkedin": {
    "connectionRequest": "...",
    "message": "..."
  },
  "keyValueProps": ["...", "..."],
  "personalizationHooks": ["...", "..."]
}`
    : contentFormat === "sequences"
    ? `{
  "persona": "${persona}",
  "emailSequence": [
    { "subject": "...", "body": "...", "purpose": "Introduction" },
    { "subject": "...", "body": "...", "purpose": "Value Demo" },
    { "subject": "...", "body": "...", "purpose": "Social Proof + CTA" }
  ],
  "linkedin": {
    "connectionRequest": "...",
    "followUp": "..."
  },
  "keyValueProps": ["...", "..."]
}`
    : `{
  "persona": "${persona}",
  "emailSubjects": ["...", "...", "..."],
  "openingSentences": ["...", "...", "..."],
  "valuePropositions": ["...", "...", "..."],
  "linkedinOpeners": ["...", "...", "..."]
}`
}`;

      try {
        let result: any;
        if (useOpenAI) {
          const resp = await callOpenAI(prompt, systemPrompt, openaiApiKey);
          usage.openai.calls++;
          usage.openai.inputTokens += resp.inputTokens;
          usage.openai.outputTokens += resp.outputTokens;
          result = parseAIResponse(resp.content);
          console.log(`✓ ${persona} outreach generated (openai)`);
        } else {
          const resp = await callGemini(prompt, systemPrompt, geminiApiKey);
          usage.gemini.calls++;
          usage.gemini.inputTokens += resp.inputTokens;
          usage.gemini.outputTokens += resp.outputTokens;
          result = parseAIResponse(resp.content);
          console.log(`✓ ${persona} outreach generated (gemini)`);
        }
        return { persona, result };
      } catch (e) {
        console.error(`✗ ${persona} outreach failed:`, e);
        return { persona, result: { error: String(e) } };
      }
    });

    const outreachResults = await Promise.all(outreachPromises);

    for (const { persona, result } of outreachResults) {
      personaOutreach[persona] = result;
    }

    // Build final report
    const endTime = Date.now();
    const generationTimeSeconds = Math.round((endTime - startTime) / 1000);

    const report = {
      clientName,
      clientWebsite,
      salesforceId,
      contentFormat,
      personas,
      outreach: personaOutreach,
      sources: validatedSources.slice(0, 50).map((s, i) => ({
        number: i + 1,
        title: s.title,
        url: s.url,
        provider: s.provider,
        relevanceScore: (s as any).relevanceScore || 0,
      })),
      metadata: {
        generatedAt: new Date().toISOString(),
        generationTimeSeconds,
        personaCount: personas.length,
        // NEW: Relevance scoring
        relevanceScore: {
          score: reportConfidence.score,
          level: reportConfidence.level,
          explanation: reportConfidence.explanation,
          sourceValidation: {
            total: sourceValidationStats.total,
            validated: sourceValidationStats.valid,
            filtered: sourceValidationStats.filtered,
            averageRelevance: sourceValidationStats.avgScore,
          }
        }
      },
    };

    // Save to database
    const { data: savedReport, error: saveError } = await supabaseService
      .from("account_intelligence_reports")
      .insert({
        user_id: userId,
        client_name: clientName,
        client_website: clientWebsite,
        salesforce_id: salesforceId || null,
        report_type: "outreach",
        report_data: report,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Error saving report:", saveError);
    }

    // Save usage analytics
    const openaiCost = (usage.openai.inputTokens * 0.005 + usage.openai.outputTokens * 0.015) / 1000;
    const geminiCost = (usage.gemini.inputTokens * 0.00125 + usage.gemini.outputTokens * 0.005) / 1000;
    const googleCost = usage.googleSearch.calls * 0.005;
    const serperCost = usage.serper.calls * 0.001;
    const embeddingCost = (usage.embedding.tokens * 0.00002) / 1000;
    const totalCost = openaiCost + geminiCost + googleCost + serperCost + embeddingCost;

    await supabaseService.from("account_intelligence_usage").insert({
      report_id: savedReport?.id || null,
      user_id: userId,
      client_name: clientName,
      report_type: "outreach",
      openai_calls: usage.openai.calls,
      openai_input_tokens: usage.openai.inputTokens,
      openai_output_tokens: usage.openai.outputTokens,
      openai_cost_usd: openaiCost,
      gemini_calls: usage.gemini.calls,
      gemini_input_tokens: usage.gemini.inputTokens,
      gemini_output_tokens: usage.gemini.outputTokens,
      gemini_cost_usd: geminiCost,
      google_search_calls: usage.googleSearch.calls,
      google_search_results: usage.googleSearch.results,
      google_search_cost_usd: googleCost,
      serper_calls: usage.serper.calls,
      serper_results: usage.serper.results,
      serper_cost_usd: serperCost,
      embedding_calls: usage.embedding.calls,
      embedding_tokens: usage.embedding.tokens,
      embedding_cost_usd: embeddingCost,
      total_cost_usd: totalCost,
      generation_time_seconds: generationTimeSeconds,
    });

    console.log(
      `\nOutreach report generated for ${clientName}. Personas: ${personas.length}. Time: ${generationTimeSeconds}s. Cost: $${totalCost.toFixed(4)}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        reportId: savedReport?.id,
        report,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Outreach report error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
