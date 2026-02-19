import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface StrategyMapInput {
  clientName: string;
  clientWebsite: string;
  salesforceId?: string;
}

// Usage tracking for analytics
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

async function googleCustomSearch(
  params: {
    query: string;
    googleApiKey: string;
    googleCx: string;
    category: string;
    type: SourceType;
    collector: CollectedSource[];
    dateRestrict?: string;
  },
): Promise<{ title: string; link: string; snippet?: string }[]> {
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
  searchType: "search" | "news" = "search",
): Promise<any[]> {
  try {
    const response = await fetch(`https://google.serper.dev/${searchType}`, {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 10,
      }),
    });

    if (!response.ok) {
      console.error(`Serper ${searchType} search error:`, response.status);
      return [];
    }

    const data = await response.json();
    const results = searchType === "news" ? data.news || [] : data.organic || [];

    for (const r of results) {
      collector.push({
        title: r.title || "",
        url: cleanUrl(r.link || ""),
        snippet: r.snippet || r.description || "",
        query,
        type: searchType === "news" ? "news" : "web",
        category,
        provider: "serper",
      });
    }

    console.log(`[Serper ${searchType}] "${query}" => ${results.length} results`);
    return results;
  } catch (e) {
    console.error("Serper search exception:", e);
    return [];
  }
}

interface OpenAIResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

async function callOpenAI(prompt: string, systemPrompt: string, openaiApiKey: string): Promise<OpenAIResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

interface GeminiResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

async function callGemini(prompt: string, systemPrompt: string, geminiApiKey: string): Promise<GeminiResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
  };
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

    console.log(`[RAG] Generated embedding with ${embedding.length} dimensions for query: "${query.slice(0, 50)}..."`);
    
    // External DB at fvtotnmzlncqrndeybak.supabase.co expects: (filter, match_count, query_embedding)
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
    
    if (data && data.length > 0) {
      for (const doc of data.slice(0, 3)) {
        const docName = doc.metadata?.title || doc.metadata?.file_name || doc.metadata?.source || "Unknown";
        console.log(`[RAG] Match: ${(doc.similarity * 100).toFixed(1)}% - ${docName}`);
      }
    }
    
    return data || [];
  } catch (e) {
    console.error("[RAG] Search exception:", e);
    return [];
  }
}

function parseAIResponse(content: string): { data: any; aiUrls: string[] } {
  const urls: string[] = [];
  const urlRegex = /https?:\/\/[^\s\)\]\}"',<>]+/g;
  const matches = content.match(urlRegex);
  if (matches) {
    urls.push(...matches.map(cleanUrl));
  }

  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;

  try {
    const cleanJson = jsonStr.replace(/```json|```/g, "").trim();
    return { data: JSON.parse(cleanJson), aiUrls: urls };
  } catch {
    return { data: { rawContent: content }, aiUrls: urls };
  }
}

// Section definitions with models and prompts
const SECTIONS = {
  vision: {
    model: "openai",
    systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales.
Generate a compelling Vision statement that captures the client's aspirational goal.
Return ONLY valid JSON matching this schema:
{
  "vision": "A single compelling vision statement (1-2 sentences) describing the company's aspirational goal for customer engagement and value delivery"
}`,
  },
  leadershipMandates: {
    model: "gemini",
    systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales.
Identify 3 Enterprise Leadership Mandates - high-level strategic imperatives from the C-suite.
These should be bold, action-oriented statements like "EXPAND MARKET PRESENCE GLOBALLY" or "DRIVE GROWTH THROUGH INNOVATION".
Return ONLY valid JSON matching this schema:
{
  "mandates": [
    { "title": "BOLD ACTION PHRASE", "subtitle": "Supporting context in 2-4 words" }
  ]
}`,
  },
  transformationPriorities: {
    model: "openai",
    systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales.
Identify 3 Transformation Priorities - the strategic initiatives that enable the leadership mandates.
These should be concise transformation themes like "Predictive, proactive customer engagement" or "Measurable digital adoption and onboarding".
Return ONLY valid JSON matching this schema:
{
  "priorities": [
    { "priority": "Transformation priority statement (5-8 words)" }
  ]
}`,
  },
  desiredOutcomes: {
    model: "gemini",
    systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales.
Identify 4 Desired Business Outcomes - measurable business results the company wants to achieve.
These should be outcome-focused statements like "Improve SMB account retention through automated, data-driven risk identification" or "Reduce onboarding cycle times and increase feature activation rates".
Return ONLY valid JSON matching this schema:
{
  "outcomes": [
    { "outcome": "Detailed business outcome statement (15-25 words)" }
  ]
}`,
  },
  useCases: {
    model: "openai",
    systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales engagement with Pendo.
Identify 7 specific Use Cases that show how Pendo's platform can help achieve the desired outcomes.
These should be actionable use cases like "Automated onboarding journeys combining in-app and email triggers" or "Real-time churn and upsell alerts surfaced through Salesforce".
Return ONLY valid JSON matching this schema:
{
  "useCases": [
    { "useCase": "Specific Pendo-relevant use case (8-12 words)" }
  ]
}`,
  },
  sources: {
    model: "gemini",
    systemPrompt: `You are a research analyst. Review the provided sources and select the 5 most relevant and authoritative ones for this Strategy Map.
Return ONLY valid JSON matching this schema:
{
  "sources": [
    { "title": "Source title", "url": "Source URL" }
  ]
}`,
  },
};

// Query templates for research
const CATEGORY_QUERIES: { category: string; type: SourceType; query: (vars: { clientName: string; clientWebsite: string; year: number }) => string; dateRestrict?: string }[] = [
  // Strategic Priorities & Leadership
  { category: "strategy", type: "web", query: ({ clientName, year }) => `${clientName} strategic priorities ${year}` },
  { category: "ceo_letter", type: "web", query: ({ clientName }) => `${clientName} CEO letter shareholders 2024` },
  { category: "corporate_goals", type: "web", query: ({ clientName }) => `${clientName} corporate objectives goals mission vision` },
  { category: "transformation", type: "web", query: ({ clientName }) => `${clientName} digital transformation strategy customer experience` },
  
  // Customer Experience & Engagement
  { category: "customer_experience", type: "web", query: ({ clientName }) => `${clientName} customer experience CX strategy` },
  { category: "customer_success", type: "web", query: ({ clientName }) => `${clientName} customer success retention strategy` },
  { category: "digital_adoption", type: "web", query: ({ clientName }) => `${clientName} digital adoption product analytics` },
  { category: "onboarding", type: "web", query: ({ clientName }) => `${clientName} customer onboarding activation` },
  
  // Growth & Expansion
  { category: "growth_strategy", type: "web", query: ({ clientName }) => `${clientName} growth expansion strategy market` },
  { category: "expansion_revenue", type: "web", query: ({ clientName }) => `${clientName} upsell cross-sell expansion revenue` },
  { category: "market_expansion", type: "web", query: ({ clientName }) => `${clientName} market expansion international growth` },
  
  // Operational Excellence
  { category: "operational", type: "web", query: ({ clientName }) => `${clientName} operational efficiency automation` },
  { category: "cost_optimization", type: "web", query: ({ clientName }) => `${clientName} cost reduction efficiency margins` },
  
  // Product & Innovation
  { category: "product_strategy", type: "web", query: ({ clientName }) => `${clientName} product roadmap innovation strategy` },
  { category: "product_analytics", type: "web", query: ({ clientName }) => `${clientName} product analytics user behavior insights` },
  
  // Recent News
  { category: "news_recent", type: "news", query: ({ clientName }) => `${clientName} strategy announcement 2025`, dateRestrict: "d60" },
  { category: "press_releases", type: "web", query: ({ clientName }) => `${clientName} press release announcement 2024 2025` },
];

// Map sections to relevant source categories
const SECTION_CATEGORIES: Record<string, string[]> = {
  vision: ["corporate_goals", "ceo_letter", "strategy", "transformation"],
  leadershipMandates: ["ceo_letter", "corporate_goals", "strategy", "growth_strategy", "market_expansion"],
  transformationPriorities: ["transformation", "digital_adoption", "customer_experience", "product_strategy"],
  desiredOutcomes: ["customer_success", "growth_strategy", "expansion_revenue", "operational", "cost_optimization", "onboarding"],
  useCases: ["digital_adoption", "product_analytics", "customer_experience", "onboarding", "customer_success", "expansion_revenue"],
  sources: ["news_recent", "press_releases", "corporate_goals", "strategy"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const GOOGLE_CX = Deno.env.get("GOOGLE_CX");
    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY") || "";

    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured");
    if (!GOOGLE_CX) throw new Error("GOOGLE_CX is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input: StrategyMapInput = await req.json();
    const { clientName, clientWebsite, salesforceId } = input;

    if (!clientName || !clientWebsite) {
      return new Response(JSON.stringify({ error: "clientName and clientWebsite are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentYear = new Date().getFullYear();
    const startTime = Date.now();
    
    // Initialize usage tracking
    const usage: UsageTracker = {
      openai: { calls: 0, inputTokens: 0, outputTokens: 0 },
      gemini: { calls: 0, inputTokens: 0, outputTokens: 0 },
      googleSearch: { calls: 0, results: 0 },
      serper: { calls: 0, results: 0 },
      embedding: { calls: 0, tokens: 0 },
    };
    
    console.log(`Starting Strategy Map for ${clientName} using OpenAI + Gemini + Google CSE + RAG`);

    // RAG: Connect to external knowledge base for Pendo-specific insights
    const externalSupabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalSupabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
    
    let ragDocs: { id?: number; content: string; metadata: any; similarity: number }[] = [];
    let ragContext = "";
    if (externalSupabaseUrl && externalSupabaseServiceKey) {
      const externalSupabaseAdmin = createClient(externalSupabaseUrl, externalSupabaseServiceKey);
      
      // RAG: Search by industry/use case + Pendo whitespace queries
      const ragQueries = [
        "digital transformation customer experience strategy Pendo",
        "product-led growth PLG self-service adoption conversion",
        "in-app guidance onboarding feature adoption ROI",
        "Pendo whitespace competitive gap opportunity displacement",
        "Pendo versus WalkMe Whatfix Amplitude Mixpanel comparison",
        "enterprise use case digital adoption platform DAP ROI",
      ];
      
      console.log(`[RAG] Searching external knowledge base with ${ragQueries.length} queries...`);
      
      const ragPromises = ragQueries.map(query => 
        searchRAGDocuments(query, OPENAI_API_KEY, externalSupabaseAdmin, 10)
      );
      
      const ragResults = await Promise.all(ragPromises);
      
      // Track RAG embedding calls
      usage.embedding.calls = ragQueries.length;
      usage.embedding.tokens = ragQueries.length * 100;
      
      // Deduplicate by document ID
      const seenIds = new Set<number | string>();
      for (const docs of ragResults) {
        for (const doc of docs) {
          const docId = doc.id ?? doc.content.slice(0, 100);
          if (!seenIds.has(docId)) {
            seenIds.add(docId);
            ragDocs.push(doc);
          }
        }
      }
      
      // Sort by similarity and take top 15
      ragDocs.sort((a, b) => b.similarity - a.similarity);
      ragDocs = ragDocs.slice(0, 15);
      
      console.log(`[RAG] Connected to external knowledge base, found ${ragDocs.length} unique documents`);
      
      if (ragDocs.length > 0) {
        ragContext = `\n=== INTERNAL KNOWLEDGE BASE (Pendo case studies & whitespace intelligence) ===
These are case studies and testimonials from SIMILAR companies. Use these to:
1. Identify Pendo use cases that align with client transformation priorities
2. Extract whitespace opportunities vs competitors (WalkMe, Whatfix, Amplitude)
3. Provide proof points and ROI metrics for recommended solutions

${ragDocs
          .map((doc, i) => `[RAG ${i + 1}] ${doc.content.slice(0, 500)}${doc.content.length > 500 ? "..." : ""}`)
          .join("\n\n")}\n`;
      }
      
      console.log(`[RAG] Using ${ragDocs.length} internal documents for context enrichment`);
    } else {
      console.log("[RAG] External Supabase credentials not configured, skipping RAG search");
    }

    // Research phase - collect sources
    const sourceCollector: CollectedSource[] = [];
    const queryVars = { clientName, clientWebsite, year: currentYear };

    // Run Google searches in parallel
    const googlePromises = CATEGORY_QUERIES.map((q) =>
      googleCustomSearch({
        query: q.query(queryVars),
        googleApiKey: GOOGLE_API_KEY,
        googleCx: GOOGLE_CX,
        category: q.category,
        type: q.type,
        collector: sourceCollector,
        dateRestrict: q.dateRestrict,
      })
    );

    await Promise.allSettled(googlePromises);
    
    // Track Google search API usage
    usage.googleSearch.calls = CATEGORY_QUERIES.length;
    usage.googleSearch.results = sourceCollector.filter(s => s.provider === "google").length;

    // Optional Serper enrichment
    if (SERPER_API_KEY) {
      const serperPromises = CATEGORY_QUERIES.slice(0, 8).map((q) =>
        serperSearch(
          q.query(queryVars),
          SERPER_API_KEY,
          q.category,
          sourceCollector,
          q.type === "news" ? "news" : "search"
        )
      );
      await Promise.allSettled(serperPromises);
      
      // Track Serper API usage
      usage.serper.calls = 8;
      usage.serper.results = sourceCollector.filter(s => s.provider === "serper").length;
    }

    console.log(`Collected ${sourceCollector.length} total sources`);

    // Filter sources to keep only those relevant to the client
    console.log(`[Source Validation] Starting validation for ${sourceCollector.length} sources...`);
    const { validSources: validatedSources, stats: sourceValidationStats } = filterRelevantSources(
      sourceCollector,
      clientName,
      clientWebsite
    );
    console.log(`[Source Validation] Kept ${sourceValidationStats.valid} of ${sourceValidationStats.total} sources (filtered ${sourceValidationStats.filtered} irrelevant)`);
    
    // Calculate overall report confidence
    const reportConfidence = calculateReportConfidence(sourceValidationStats, ragDocs.length);
    console.log(`[Report Confidence] Score: ${reportConfidence.score}% (${reportConfidence.level})`);

    // Build source context for each section (using validated sources only)
    const buildSourceContext = (sectionKey: string): string => {
      const relevantCategories = SECTION_CATEGORIES[sectionKey] || [];
      const relevantSources = validatedSources.filter((s) =>
        relevantCategories.includes(s.category)
      );
      
      const dedupedSources = Array.from(
        new Map(relevantSources.map((s) => [s.url, s])).values()
      ).slice(0, 15);

      return dedupedSources
        .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet || ""}`)
        .join("\n\n");
    };

    // Generate sections in parallel
    const generateSection = async (
      key: string,
      config: typeof SECTIONS.vision
    ): Promise<{ key: string; data: any; urls: string[] }> => {
      const sourceContext = buildSourceContext(key);
      
      // Add RAG context for useCases section (most relevant for whitespace)
      const ragSuffix = (key === "useCases" || key === "transformationPriorities") && ragContext
        ? `\n${ragContext}\n\nUse the internal knowledge base above to identify Pendo-specific use cases and whitespace opportunities.`
        : "";
      
      const prompt = `Company: ${clientName}
Website: ${clientWebsite}

Research Sources:
${sourceContext}${ragSuffix}

Generate the ${key} section for the Strategy Map. Return ONLY valid JSON.`;

      try {
        if (config.model === "openai") {
          const response = await callOpenAI(prompt, config.systemPrompt, OPENAI_API_KEY);
          usage.openai.calls++;
          usage.openai.inputTokens += response.inputTokens;
          usage.openai.outputTokens += response.outputTokens;
          const { data, aiUrls } = parseAIResponse(response.content);
          console.log(`Generated ${key} section`);
          return { key, data, urls: aiUrls };
        } else {
          const response = await callGemini(prompt, config.systemPrompt, GEMINI_API_KEY);
          usage.gemini.calls++;
          usage.gemini.inputTokens += response.inputTokens;
          usage.gemini.outputTokens += response.outputTokens;
          const { data, aiUrls } = parseAIResponse(response.content);
          console.log(`Generated ${key} section`);
          return { key, data, urls: aiUrls };
        }
      } catch (e) {
        console.error(`Error generating ${key}:`, e);
        return { key, data: { rawContent: `Error generating ${key}` }, urls: [] };
      }
    };

    const sectionResults = await Promise.all(
      Object.entries(SECTIONS).map(([key, config]) => generateSection(key, config))
    );

    // Merge results
    const reportData: Record<string, any> = {};
    const allAiUrls: string[] = [];

    for (const result of sectionResults) {
      reportData[result.key] = result.data;
      allAiUrls.push(...result.urls);
    }

    // Build comprehensive sources list (from validated sources only)
    const uniqueSources = Array.from(
      new Map(
        validatedSources.map((s) => [s.url, { title: s.title, url: s.url, relevanceScore: (s as any).relevanceScore || 0 }])
      ).values()
    );

    reportData.comprehensiveSources = uniqueSources.slice(0, 20);

    // Add metadata with relevance scoring
    reportData._metadata = {
      generatedAt: new Date().toISOString(),
      clientName,
      clientWebsite,
      salesforceId: salesforceId || null,
      searchResults: {
        totalSources: sourceValidationStats.total,
        validatedSources: sourceValidationStats.valid,
        filteredSources: sourceValidationStats.filtered,
        uniqueSources: uniqueSources.length,
      },
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
    };

    // Save to database
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const { data: savedReport, error: saveError } = await supabaseService
      .from("account_intelligence_reports")
      .insert({
        user_id: user.id,
        client_name: clientName,
        client_website: clientWebsite,
        salesforce_id: salesforceId || null,
        report_type: "strategy_map",
        report_data: reportData,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving report:", saveError);
    }

    // Calculate costs and save usage analytics
    const generationTimeSeconds = Math.round((Date.now() - startTime) / 1000);
    
    const costs = {
      openai: (usage.openai.inputTokens * 2.5 / 1_000_000) + (usage.openai.outputTokens * 10 / 1_000_000),
      gemini: (usage.gemini.inputTokens * 0.075 / 1_000_000) + (usage.gemini.outputTokens * 0.30 / 1_000_000),
      googleSearch: usage.googleSearch.calls * 0.005,
      serper: usage.serper.calls * 0.001,
      embedding: usage.embedding.tokens * 0.00002 / 1000,
    };
    const totalCost = costs.openai + costs.gemini + costs.googleSearch + costs.serper + costs.embedding;

    const { error: usageError } = await supabaseService
      .from("account_intelligence_usage")
      .insert({
        report_id: savedReport?.id || null,
        user_id: user.id,
        client_name: clientName,
        report_type: "strategy_map",
        openai_calls: usage.openai.calls,
        openai_input_tokens: usage.openai.inputTokens,
        openai_output_tokens: usage.openai.outputTokens,
        openai_cost_usd: costs.openai,
        gemini_calls: usage.gemini.calls,
        gemini_input_tokens: usage.gemini.inputTokens,
        gemini_output_tokens: usage.gemini.outputTokens,
        gemini_cost_usd: costs.gemini,
        google_search_calls: usage.googleSearch.calls,
        google_search_results: usage.googleSearch.results,
        google_search_cost_usd: costs.googleSearch,
        serper_calls: usage.serper.calls,
        serper_results: usage.serper.results,
        serper_cost_usd: costs.serper,
        embedding_calls: usage.embedding.calls,
        embedding_tokens: usage.embedding.tokens,
        embedding_cost_usd: costs.embedding,
        total_cost_usd: totalCost,
        generation_time_seconds: generationTimeSeconds,
      });

    if (usageError) console.error("Error saving usage analytics:", usageError);

    console.log(`Strategy Map completed for ${clientName} (cost: $${totalCost.toFixed(4)})`);

    return new Response(
      JSON.stringify({
        success: true,
        reportId: savedReport?.id,
        report: reportData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Strategy Map error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
