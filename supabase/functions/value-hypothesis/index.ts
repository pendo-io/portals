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

interface ValueHypothesisInput {
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
      body: JSON.stringify({ q: query, num: 10 }),
    });

    if (!response.ok) {
      console.error(`Serper ${searchType} error:`, response.status);
      return [];
    }

    const data = await response.json();
    const results = searchType === "news"
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
        max_completion_tokens: 12000,
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
            temperature: 0.6,
            maxOutputTokens: 12000,
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
  matchCount: number = 10,
  matchThreshold: number = 0.5
): Promise<{ id?: number; content: string; metadata: any; similarity: number }[]> {
  try {
    const embedding = await generateEmbedding(query, openaiApiKey);
    if (embedding.length === 0) {
      console.log("[RAG] No embedding generated, skipping search");
      return [];
    }

    console.log(`[RAG] Generated embedding with ${embedding.length} dimensions for query: "${query.slice(0, 50)}..."`);
    console.log(`[RAG] Embedding first 3 values: [${embedding.slice(0, 3).map(v => v.toFixed(6)).join(", ")}]`);
    
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

function extractUrls(content: string): string[] {
  const urlRegex = /https?:\/\/[^ -\u0020\)\]"'<>]+/g;
  const urls = content.match(urlRegex) || [];
  return Array.from(new Set(urls.map((u) => cleanUrl(u)).filter(Boolean)));
}

function parseAIResponse(content: string, sectionKey?: string): { data: any; aiUrls: string[] } {
  const aiUrls = extractUrls(content);

  try {
    let jsonStr = content;
    
    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    // Extract the JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) jsonStr = objectMatch[0];
    
    const parsed = JSON.parse(jsonStr);
    
    // If the section key is in the parsed data, extract it
    if (sectionKey && parsed[sectionKey]) {
      return { data: { [sectionKey]: parsed[sectionKey] }, aiUrls };
    }
    
    return { data: parsed, aiUrls };
  } catch (e) {
    console.error(`[Parse] JSON parse failed for ${sectionKey || 'unknown'}:`, e);
    console.error(`[Parse] Content preview: ${content.slice(0, 200)}...`);
    return { data: { rawContent: content }, aiUrls };
  }
}

// 6-section Value Hypothesis report structure matching PDF format
const SECTIONS = [
  {
    key: "valueHypothesis",
    model: "openai" as const,
    system: `You are an elite strategic account advisor specializing in B2B SaaS value propositions.

Your task is to create the MAIN CORPORATE OBJECTIVE headline and a compelling Value Hypothesis Statement.

CRITICAL REQUIREMENTS:
- corporateObjective: A single, clear headline summarizing their top strategic priority (e.g., "Expand product scope beyond core HR into adjacent systems of record")
- statement: The value hypothesis following the format: "If [Company] leverages Pendo to [specific action], they can achieve [specific measurable outcome] which directly supports their stated objective of [quoted corporate goal]."
- Pull the corporate goal from their 10-K, annual report, or earnings call transcript
- Be specific about what Pendo capability addresses the goal
- Include a measurable outcome (%, $, time saved, etc.)
- Cite the source URL for the corporate goal

Return ONLY valid JSON. Do not wrap with markdown.`,
    schema: `{
  "valueHypothesis": {
    "corporateObjective": "Main strategic objective headline (e.g., Expand product scope beyond core HR into adjacent systems)",
    "statement": "If [Company] leverages Pendo to [specific action], they can achieve [specific measurable outcome] which directly supports their stated objective of [quoted corporate goal].",
    "quotedSource": "URL to 10-K or annual report where this objective is stated",
    "pendoCapability": "Specific Pendo feature/module that addresses this",
    "expectedOutcome": "Measurable business impact"
  }
}`,
  },
  {
    key: "keyInitiatives",
    model: "gemini" as const,
    system: `You are an elite business strategy analyst tracking corporate initiatives.

Your task is to identify 3-5 key strategic initiatives the company is actively pursuing in 2024-2025.
These will be displayed in a table format.

CRITICAL REQUIREMENTS:
- Focus on initiatives related to: product launches, acquisitions, market expansion, digital transformation
- Each initiative MUST have a source URL
- Be specific about what the company is doing
- Keep descriptions concise (1-2 sentences)

Return ONLY valid JSON. Do not wrap with markdown.`,
    schema: `{
  "keyInitiatives": [
    {
      "initiative": "Launch Bob Finance to unify HR, payroll, and finance workflows",
      "description": "Complete product line expansion into adjacent finance workflows",
      "source": "https://..."
    }
  ]
}`,
  },
  {
    key: "desiredOutcomes",
    model: "openai" as const,
    system: `You are an elite KPI and metrics analyst specializing in B2B SaaS success metrics.

Your task is to identify 3-5 measurable desired outcomes that tie to the company's objectives.
These will be displayed as a bullet list alongside initiatives.

CRITICAL REQUIREMENTS:
- Each outcome MUST be a complete, descriptive sentence
- Format examples:
  * "Maintain #1 rank in mid-market HRMS User Experience and Vendor Satisfaction (Sapient Insights)"
  * "Grow customer base from 4,200+ to 5,000+ customers by FY2026 (benchmark)"
  * "Increase Trustpilot rating from 4.4/5 to 4.5/5 by 2026-12-31 (benchmark)"
- Include source name in parentheses at the end when applicable
- Be specific with numbers, percentages, and dates
- Each outcome should read as a standalone goal statement

Return ONLY valid JSON. Do not wrap with markdown.`,
    schema: `{
  "desiredOutcomes": [
    {
      "outcome": "Maintain #1 rank in mid-market HRMS User Experience and Vendor Satisfaction (Sapient Insights)",
      "source": "https://..."
    },
    {
      "outcome": "Grow customer base from 4,200+ to 5,000+ customers by FY2026 (benchmark)",
      "source": "https://..."
    }
  ]
}`,
  },
  {
    key: "pendoCriteria",
    model: "gemini" as const,
    system: `You are an elite product analytics strategist with deep expertise in Pendo's capabilities.

Your task is to identify 3-5 Pendo-relevant success criteria that signal value delivery.
These are specific, measurable thresholds that indicate Pendo is driving business impact.

CRITICAL REQUIREMENTS:
- Each criterion should be a specific measurable threshold (e.g., "70% of users complete X within Y days")
- Focus on product analytics signals: feature adoption, user engagement, onboarding completion, support deflection
- Link to a desired outcome when relevant
- Be specific about the percentage, timeframe, or metric

Return ONLY valid JSON. Do not wrap with markdown.`,
    schema: `{
  "pendoCriteria": [
    {
      "threshold": "70%",
      "behavior": "of active admin users complete Bob Finance initial setup flow within 30 days of enablement",
      "fullCriterion": "70% of active admin users complete Bob Finance initial setup flow within 30 days of enablement",
      "linkedOutcome": "Increase feature adoption",
      "pendoTool": "Guides"
    }
  ]
}`,
  },
  {
    key: "corporateObjectives",
    model: "openai" as const,
    system: `You are an elite corporate strategy analyst specializing in extracting strategic objectives.

Your task is to identify 3-5 corporate objectives from the company's official documents.

CRITICAL REQUIREMENTS:
- Each objective MUST have a direct source URL
- Rank objectives by strategic importance
- Explain why each objective matters for Pendo positioning
- Be specific about the business outcome

Return ONLY valid JSON. Do not wrap with markdown.`,
    schema: `{
  "corporateObjectives": [
    {
      "number": 1,
      "objective": "Expand into adjacent finance/payroll markets",
      "whyItMatters": "Creates cross-sell opportunities and increases platform stickiness",
      "source": "https://..."
    }
  ]
}`,
  },
  {
    key: "sources",
    model: "gemini" as const,
    system: `You are an elite research librarian compiling a comprehensive bibliography.

Your task is to create a numbered list of all sources used across this Value Hypothesis report.

CRITICAL REQUIREMENTS:
- Include ONLY sources from the provided research data
- Include the full title and URL
- Remove duplicates
- Order by relevance and recency

Return ONLY valid JSON. Do not wrap with markdown.`,
    schema: `{
  "sources": [
    {
      "number": 1,
      "title": "HiBob Company Profile",
      "url": "https://...",
      "type": "company_website"
    }
  ]
}`,
  },
];

// Expanded category queries matching account-intelligence depth
const CATEGORY_QUERIES: Array<{ category: string; type: SourceType; query: (p: { clientName: string; year: number }) => string; dateRestrict?: string }> = [
  // SEC & Financial Filings (Critical for Value Hypothesis)
  { category: "sec_filing", type: "web", query: ({ clientName, year }) => `${clientName} 10-K SEC filing ${year}` },
  { category: "sec_10k_2024", type: "web", query: ({ clientName }) => `${clientName} 10-K annual report SEC EDGAR 2024` },
  { category: "sec_10k_2023", type: "web", query: ({ clientName }) => `${clientName} 10-K annual report SEC EDGAR 2023` },
  { category: "annual_report", type: "web", query: ({ clientName, year }) => `${clientName} annual report ${year} PDF` },
  { category: "investor_presentation", type: "web", query: ({ clientName, year }) => `${clientName} investor presentation ${year}` },
  
  // Earnings & Financial Performance
  { category: "earnings_call", type: "web", query: ({ clientName, year }) => `${clientName} earnings call transcript ${year}` },
  { category: "earnings_q4", type: "web", query: ({ clientName }) => `${clientName} Q4 2024 earnings results` },
  { category: "earnings_q3", type: "web", query: ({ clientName }) => `${clientName} Q3 2024 earnings results` },
  { category: "financial_metrics", type: "web", query: ({ clientName, year }) => `${clientName} revenue growth ARR ${year}` },
  
  // Strategic Priorities & Objectives
  { category: "strategy", type: "web", query: ({ clientName, year }) => `${clientName} strategic priorities ${year}` },
  { category: "ceo_letter", type: "web", query: ({ clientName }) => `${clientName} CEO letter shareholders 2024` },
  { category: "corporate_goals", type: "web", query: ({ clientName }) => `${clientName} corporate objectives goals mission` },
  { category: "transformation", type: "web", query: ({ clientName }) => `${clientName} digital transformation strategy` },
  
  // Product & Customer Experience
  { category: "product_strategy", type: "web", query: ({ clientName }) => `${clientName} product roadmap strategy` },
  { category: "customer_experience", type: "web", query: ({ clientName }) => `${clientName} customer experience CX strategy` },
  { category: "product_analytics", type: "web", query: ({ clientName }) => `${clientName} product analytics user insights` },
  
  // KPIs & Metrics
  { category: "kpi_metrics", type: "web", query: ({ clientName, year }) => `${clientName} KPI metrics targets ${year}` },
  { category: "retention_metrics", type: "web", query: ({ clientName }) => `${clientName} customer retention churn rate NPS` },
  { category: "growth_metrics", type: "web", query: ({ clientName }) => `${clientName} growth metrics revenue customer acquisition` },
  
  // News & Announcements
  { category: "news_recent", type: "news", query: ({ clientName }) => `${clientName} news announcements 2025`, dateRestrict: "d30" },
  { category: "press_releases", type: "web", query: ({ clientName, year }) => `${clientName} press release announcement ${year}` },
  { category: "partnership", type: "web", query: ({ clientName }) => `${clientName} partnership acquisition investment 2024` },
];

// Map sections to their relevant source categories
const SECTION_CATEGORIES: Record<string, string[]> = {
  valueHypothesis: ["sec_filing", "sec_10k_2024", "ceo_letter", "corporate_goals", "strategy"],
  keyInitiatives: ["strategy", "transformation", "product_strategy", "news_recent", "press_releases", "partnership"],
  desiredOutcomes: ["kpi_metrics", "retention_metrics", "growth_metrics", "earnings_call", "earnings_q4", "earnings_q3", "financial_metrics"],
  pendoCriteria: ["product_strategy", "customer_experience", "product_analytics", "transformation"],
  corporateObjectives: ["sec_filing", "sec_10k_2024", "sec_10k_2023", "annual_report", "investor_presentation", "ceo_letter", "corporate_goals"],
  sources: ["sec_filing", "sec_10k_2024", "annual_report", "earnings_call", "news_recent", "press_releases"],
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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

    const input: ValueHypothesisInput = await req.json();
    const { clientName, clientWebsite, salesforceId } = input;

    if (!clientName || !clientWebsite) {
      return new Response(JSON.stringify({ error: "clientName and clientWebsite are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentDate = new Date().toISOString().split("T")[0];
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

    console.log(`Starting Value Hypothesis for ${clientName} using OpenAI + Gemini + Google CSE (${CATEGORY_QUERIES.length} queries)`);

    // RAG: Connect to external knowledge base for Pendo-specific insights
    const externalSupabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalSupabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
    
    let ragDocs: { id?: number; content: string; metadata: any; similarity: number }[] = [];
    let ragContext = "";
    if (externalSupabaseUrl && externalSupabaseServiceKey) {
      const externalSupabaseAdmin = createClient(externalSupabaseUrl, externalSupabaseServiceKey);
      
      // RAG: Search by INDUSTRY/USE CASE categories, not client name
      // The knowledge base contains case studies, testimonials, and PBO references from similar companies
      // Added Pendo whitespace queries for competitive positioning
      const ragQueries = [
        "product analytics customer engagement use cases testimonials",
        "digital adoption onboarding user retention case study",
        "in-app guidance feature adoption ROI success metrics",
        "customer feedback NPS surveys product insights outcomes",
        "SaaS enterprise software analytics platform testimonial",
        "value hypothesis business outcomes customer success",
        // Pendo whitespace queries for competitive positioning
        "Pendo whitespace competitive gap opportunity displacement",
        "Pendo versus WalkMe Whatfix Amplitude Mixpanel comparison",
        "digital adoption platform DAP enterprise use case ROI",
        "Pendo Listen feedback session replay NPS competitive",
      ];
      
      console.log(`[RAG] Searching external knowledge base with ${ragQueries.length} industry/use-case queries...`);
      
      // Run all RAG queries in parallel and combine results
      const ragPromises = ragQueries.map(query => 
        searchRAGDocuments(query, OPENAI_API_KEY, externalSupabaseAdmin, 10)
      );
      
      const ragResults = await Promise.all(ragPromises);
      
      // Track RAG embedding calls (one embedding per query)
      usage.embedding.calls = ragQueries.length;
      // Approximate token count: ~100 tokens per query average
      usage.embedding.tokens = ragQueries.length * 100;
      // Deduplicate by document ID (if available) or content hash
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
      
      console.log(`[RAG] Connected to external knowledge base, found ${ragDocs.length} unique documents across all queries`);
      
      if (ragDocs.length > 0) {
        ragContext = `\n=== INTERNAL KNOWLEDGE BASE (Pendo-specific case studies & testimonials - USE FOR INTERPRETATION) ===
These are case studies and testimonials from SIMILAR companies in similar industries. The client name "${clientName}" will NOT appear in these documents.
Use these to:
1. Find similar use cases from companies in the same sector
2. Extract PBO proof points and ROI metrics from comparable customers
3. Reference testimonials about similar challenges/solutions
4. Identify Pendo whitespace opportunities vs competitors (WalkMe, Whatfix, Amplitude)

${ragDocs
          .map((doc, i) => `[RAG ${i + 1}] ${doc.content.slice(0, 600)}${doc.content.length > 600 ? "..." : ""}`)
          .join("\n\n")}\n`;
      }
      
      console.log(`[RAG] Using ${ragDocs.length} internal documents for context enrichment`);
    } else {
      console.log("[RAG] External Supabase credentials not configured, skipping RAG search");
    }

    // Research phase - expanded queries
    const collected: CollectedSource[] = [];

    const googlePromises = CATEGORY_QUERIES.map((q) =>
      googleCustomSearch({
        query: q.query({ clientName, year: currentYear }),
        googleApiKey: GOOGLE_API_KEY,
        googleCx: GOOGLE_CX,
        category: q.category,
        type: q.type,
        dateRestrict: q.dateRestrict,
        collector: collected,
      })
    );

    // Add Serper for additional news coverage
    const serperPromises = SERPER_API_KEY
      ? [
          serperSearch(`${clientName} 10-K SEC filing 2024`, SERPER_API_KEY, "sec_filing", collected, "search"),
          serperSearch(`${clientName} earnings call 2024`, SERPER_API_KEY, "earnings_call", collected, "search"),
          serperSearch(`${clientName} news announcements 2025`, SERPER_API_KEY, "news_recent", collected, "news"),
        ]
      : [];

    const searchResults = await Promise.all([...googlePromises, ...serperPromises]);
    
    // Track search API usage
    usage.googleSearch.calls = CATEGORY_QUERIES.length;
    usage.googleSearch.results = collected.filter(s => s.provider === "google").length;
    usage.serper.calls = SERPER_API_KEY ? 3 : 0;
    usage.serper.results = collected.filter(s => s.provider === "serper").length;

    const allDedupedSources = Array.from(new Map(collected.map((s) => [s.url, s])).values());
    
    // Filter sources to keep only those relevant to the client
    console.log(`[Source Validation] Starting validation for ${allDedupedSources.length} sources...`);
    const { validSources: dedupedSources, stats: sourceValidationStats } = filterRelevantSources(
      allDedupedSources,
      clientName,
      clientWebsite
    );
    console.log(`[Source Validation] Kept ${sourceValidationStats.valid} of ${sourceValidationStats.total} sources (filtered ${sourceValidationStats.filtered} irrelevant)`);
    
    // Calculate overall report confidence
    const reportConfidence = calculateReportConfidence(sourceValidationStats, ragDocs.length);
    console.log(`[Report Confidence] Score: ${reportConfidence.score}% (${reportConfidence.level})`);
    
    console.log(`Collected ${dedupedSources.length} validated unique sources from ${CATEGORY_QUERIES.length} queries`);

    // Build per-section source lists for targeted prompts
    const sectionSources: Record<string, CollectedSource[]> = {};
    for (const section of SECTIONS) {
      const relevantCategories = SECTION_CATEGORIES[section.key] || [];
      sectionSources[section.key] = dedupedSources.filter((s) => relevantCategories.includes(s.category));
    }

    const globalContext = `
=== VALUE HYPOTHESIS RESEARCH FOR ${clientName.toUpperCase()} ===
Client: ${clientName}
Website: ${clientWebsite}
${salesforceId ? `Salesforce ID: ${salesforceId}` : "(Prospect Account)"}
Analysis Date: ${currentDate}
${ragContext}
CRITICAL RULES:
1. Use ONLY the provided sources for factual claims - do not hallucinate
2. Every objective, initiative, and metric MUST include a source URL
3. Be specific and actionable - avoid generic statements
4. Focus on Pendo-relevant value drivers: product analytics, in-app guidance, user feedback, retention
5. Return ONLY valid JSON - no markdown code blocks
`;

    console.log("Generating all 6 sections in parallel...");

    // Build Pendo whitespace intelligence block - injected GLOBALLY but with extra emphasis for pendoCriteria
    // Extract meaningful document names from content (metadata often just contains "blob")
    const extractDocName = (doc: any, index: number): string => {
      // First try metadata fields
      const metaTitle = doc.metadata?.title;
      const metaFileName = doc.metadata?.file_name;
      const metaSource = doc.metadata?.source;
      
      // If metadata has real names (not "blob"), use them
      if (metaTitle && metaTitle.toLowerCase() !== 'blob' && metaTitle.length > 3) {
        return metaTitle.trim();
      }
      if (metaFileName && metaFileName.toLowerCase() !== 'blob' && metaFileName.length > 3) {
        return metaFileName.trim();
      }
      if (metaSource && metaSource.toLowerCase() !== 'blob' && metaSource.length > 3) {
        return metaSource.trim();
      }
      
      // Extract from content: look for title patterns, headings, or first meaningful line
      const content = doc.content || '';
      
      // Try to find a title pattern (e.g., "# Title" or "Title:" at start)
      const titleMatch = content.match(/^#\s*(.+?)[\n\r]/m) || 
                         content.match(/^(.{10,80}?)[\n\r]/m) ||
                         content.match(/Title:\s*(.+?)[\n\r]/i);
      if (titleMatch && titleMatch[1]) {
        const extracted = titleMatch[1].trim().replace(/[#*_]/g, '');
        if (extracted.length > 5 && extracted.length < 100) {
          return extracted;
        }
      }
      
      // Fallback: create descriptive name based on content keywords
      const keywords = ['ROI', 'adoption', 'onboarding', 'analytics', 'guide', 'NPS', 'benchmark', 'feature'];
      for (const kw of keywords) {
        if (content.toLowerCase().includes(kw.toLowerCase())) {
          return `Pendo ${kw} Research Document ${index + 1}`;
        }
      }
      
      return `Pendo Knowledge Document ${index + 1}`;
    };
    
    const ragDocNames = ragDocs.slice(0, 10).map((doc, i) => {
      return { index: i + 1, name: extractDocName(doc, i) };
    });
    
    const pendoWhitespaceBlock = ragDocs.length > 0 ? `
=== PENDO WHITESPACE INTELLIGENCE (from internal knowledge base) ===
Use this Pendo-specific data throughout the report:
- Feature adoption thresholds and benchmarks from similar customers
- ROI metrics and success criteria from Pendo deployments
- Competitive positioning vs WalkMe, Whatfix, Amplitude, Mixpanel
- In-app guidance, NPS, analytics, and digital adoption best practices
- Value drivers and outcomes achieved by similar companies

IMPORTANT: When citing these sources, use the FULL DOCUMENT NAME from the list below.
Do NOT use "RAG 1", "Source: blob", or generic references.

Available Pendo Knowledge Documents:
${ragDocNames.map(d => `- Document ${d.index}: "${d.name}"`).join("\n")}

${ragDocs.slice(0, 10).map((doc, i) => {
      const docName = extractDocName(doc, i);
      return `[Document: "${docName}"] (${(doc.similarity * 100).toFixed(0)}% relevance)\n${doc.content.slice(0, 400)}...`;
    }).join("\n\n")}
` : "";

    console.log(`[WHITESPACE] Prepared ${ragDocs.length} Pendo documents for ALL sections enrichment`);
    console.log(`[RAG NAMES] Available for citation: ${ragDocNames.map(d => d.name).join(", ")}`);

    const sectionPromises = SECTIONS.map(async (section) => {
      const sectionSourceList = sectionSources[section.key] || dedupedSources;
      const sourcesBlock = sectionSourceList
        .slice(0, 40)
        .map((s, i) => `(${i + 1}) ${s.title}\n    ${s.snippet || ""}\n    URL: ${s.url}\n    Category: ${s.category}`)
        .join("\n\n");

      // Inject Pendo whitespace data GLOBALLY + extra emphasis for pendoCriteria
      const pendoCriteriaEmphasis = section.key === "pendoCriteria" ? `
*** CRITICAL FOR THIS SECTION ***
You MUST use the PENDO WHITESPACE INTELLIGENCE above to define:
1. Realistic adoption thresholds (e.g., "70% of users complete onboarding within 7 days")
2. Specific behaviors to track based on Pendo best practices
3. Metrics that align with similar customer success benchmarks
4. Pendo modules to leverage (Guides, Analytics, Funnels, NPS, Paths, Segments)
Do NOT use generic thresholds - use the specific data from Pendo knowledge base above.
IMPORTANT: Cite the FULL document name when referencing Pendo data, e.g., "(Source: Pendo Feature Adoption Benchmarks)" NOT "(Source: RAG 3)"
` : "";

      const prompt = `${globalContext}
${pendoWhitespaceBlock}
${pendoCriteriaEmphasis}
=== RESEARCH SOURCES (${sectionSourceList.length} sources for this section) ===
${sourcesBlock}

=== TASK ===
Generate the "${section.key}" section using the JSON schema below.
${ragDocs.length > 0 ? "Integrate Pendo whitespace intelligence where relevant. ALWAYS cite the FULL document name (not 'RAG 1' or 'RAG 7')." : ""}
Focus on accuracy and cite sources for every claim using their full names.

REQUIRED JSON SCHEMA:
${section.schema}`;

      try {
        if (section.model === "openai") {
          const response = await callOpenAI(prompt, section.system, OPENAI_API_KEY);
          usage.openai.calls++;
          usage.openai.inputTokens += response.inputTokens;
          usage.openai.outputTokens += response.outputTokens;
          return { key: section.key, model: section.model, content: response.content } as const;
        } else {
          const response = await callGemini(prompt, section.system, GEMINI_API_KEY);
          usage.gemini.calls++;
          usage.gemini.inputTokens += response.inputTokens;
          usage.gemini.outputTokens += response.outputTokens;
          return { key: section.key, model: section.model, content: response.content } as const;
        }
      } catch (e: any) {
        console.error(`Error generating ${section.key}:`, e);
        return { key: section.key, model: section.model, error: String(e?.message || e) } as const;
      }
    });

    const results = await Promise.all(sectionPromises);

    const reportData: Record<string, any> = {};
    const modelsUsed = new Set<string>();
    const allAiUrls: string[] = [];

    for (const r of results) {
      if ("content" in r && r.content) {
        const parsed = parseAIResponse(r.content, r.key);
        allAiUrls.push(...parsed.aiUrls);
        
        if (parsed.data && !parsed.data.rawContent) {
          // Extract the inner data if it's wrapped in the section key
          reportData[r.key] = parsed.data?.[r.key] ?? parsed.data;
        } else {
          reportData[r.key] = { rawContent: r.content };
        }
        modelsUsed.add(r.model);
        console.log(`✓ ${r.key} (${r.model})`);
      } else {
        reportData[r.key] = { error: (r as any).error || "Unknown error" };
        console.error(`✗ ${r.key}: ${(r as any).error}`);
      }
    }

    // Merge AI-cited URLs with collected sources
    const aiCitedSources = allAiUrls
      .filter((url) => !dedupedSources.some((s) => s.url === url))
      .map((url) => ({ title: url, url, type: "web" as SourceType, category: "ai_cited", query: "", provider: "google" as SourceProvider }));

    const finalSources = [...dedupedSources, ...aiCitedSources];

    reportData._metadata = {
      generatedAt: currentDate,
      clientName,
      clientWebsite,
      reportType: "value_hypothesis",
      models: Array.from(modelsUsed),
      searchResults: {
        totalSources: sourceValidationStats.total,
        validatedSources: sourceValidationStats.valid,
        filteredSources: sourceValidationStats.filtered,
        googleSources: finalSources.filter((s) => s.provider === "google").length,
        serperSources: finalSources.filter((s) => s.provider === "serper").length,
        aiCitedSources: aiCitedSources.length,
        news: finalSources.filter((s) => s.type === "news").length,
      },
      sourcesBySection: Object.fromEntries(
        SECTIONS.map((s) => [s.key, sectionSources[s.key]?.map((src) => ({ title: src.title, url: src.url })) || []])
      ),
      flatSources: finalSources.map((s) => ({ title: s.title, url: s.url, category: s.category, relevanceScore: (s as any).relevanceScore || 0 })),
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

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: saved, error: saveError } = await serviceClient
      .from("account_intelligence_reports")
      .insert({
        user_id: user.id,
        client_name: clientName,
        client_website: clientWebsite,
        salesforce_id: salesforceId || null,
        report_type: "value_hypothesis",
        report_data: reportData,
      })
      .select()
      .single();

    if (saveError) console.error("Error saving report:", saveError);

    // Calculate costs and save usage analytics
    const generationTimeSeconds = Math.round((Date.now() - startTime) / 1000);
    
    // Pricing (approximate per 1M tokens or per call)
    const costs = {
      openai: (usage.openai.inputTokens * 2.5 / 1_000_000) + (usage.openai.outputTokens * 10 / 1_000_000),
      gemini: (usage.gemini.inputTokens * 0.075 / 1_000_000) + (usage.gemini.outputTokens * 0.30 / 1_000_000),
      googleSearch: usage.googleSearch.calls * 0.005,
      serper: usage.serper.calls * 0.001,
      embedding: usage.embedding.tokens * 0.00002 / 1000,
    };
    const totalCost = costs.openai + costs.gemini + costs.googleSearch + costs.serper + costs.embedding;

    const { error: usageError } = await serviceClient
      .from("account_intelligence_usage")
      .insert({
        report_id: saved?.id || null,
        user_id: user.id,
        client_name: clientName,
        report_type: "value_hypothesis",
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

    console.log(`Value Hypothesis report generated for ${clientName} with ${finalSources.length} sources (cost: $${totalCost.toFixed(4)})`);

    return new Response(
      JSON.stringify({ success: true, reportId: saved?.id, report: reportData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Value Hypothesis generation error:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
