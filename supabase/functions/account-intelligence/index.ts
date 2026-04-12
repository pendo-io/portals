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
  reportType: "overview" | "strategic" | "value" | "strategy";
}

type SourceType = "web" | "news" | "linkedin";
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

// API Usage tracking
interface ApiUsage {
  openai: { calls: number; inputTokens: number; outputTokens: number };
  gemini: { calls: number; inputTokens: number; outputTokens: number };
  googleSearch: { calls: number; results: number };
  serper: { calls: number; results: number };
  embedding: { calls: number; tokens: number };
}

// Cost estimates per 1M tokens / per call (as of 2024)
const COST_RATES = {
  openai: { inputPer1M: 2.50, outputPer1M: 10.00 }, // GPT-4o pricing
  gemini: { inputPer1M: 0.075, outputPer1M: 0.30 }, // Gemini 1.5 Pro
  googleSearch: { perCall: 0.005 }, // $5 per 1000 queries
  serper: { perCall: 0.001 }, // ~$1 per 1000 queries
  embedding: { per1M: 0.02 }, // text-embedding-3-small
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
  // If source IS the client domain, it's definitely relevant
  if (sourceDomain.includes(clientDomain) || clientDomain.includes(sourceDomain.split('.')[0])) {
    return false;
  }
  
  // Government and education domains are almost never the target company
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

// Check if snippet/title indicates this is about a company/product vs generic word usage
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
  
  // Check if client name appears near company-context words
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
): { isRelevant: boolean; relevanceScore: number; reason: string } {
  const clientNameLower = clientName.toLowerCase().trim();
  const clientDomain = extractDomain(clientWebsite);
  
  const sourceTitleLower = (source.title || '').toLowerCase();
  const sourceSnippetLower = (source.snippet || '').toLowerCase();
  const sourceUrl = (source.url || '').toLowerCase();
  const sourceDomain = extractDomain(source.url || '');
  
  // STRICT CHECK 1: Reject clearly irrelevant domains (gov, edu, etc.)
  if (isIrrelevantDomain(sourceDomain, clientDomain)) {
    return { isRelevant: false, relevanceScore: 0, reason: 'irrelevant_domain_type' };
  }
  
  let score = 0;
  let reasons: string[] = [];
  
  // PRIORITY 1: Exact domain match (highest confidence - 60 points)
  const clientDomainBase = clientDomain.split('.')[0];
  const sourceDomainBase = sourceDomain.split('.')[0];
  
  if (sourceDomain === clientDomain || sourceDomainBase === clientDomainBase) {
    score += 60;
    reasons.push('exact_domain_match');
  } else if (sourceDomain.includes(clientDomainBase) || clientDomain.includes(sourceDomainBase)) {
    // Subdomain or related domain
    score += 40;
    reasons.push('related_domain');
  }
  
  // PRIORITY 2: URL path contains client name slug
  const clientNameSlug = clientNameLower.replace(/\s+/g, '-');
  const clientNameNoSpaces = clientNameLower.replace(/\s+/g, '');
  
  if (sourceUrl.includes(`/${clientNameSlug}`) || sourceUrl.includes(`/${clientNameNoSpaces}`)) {
    score += 25;
    reasons.push('url_path_contains_name');
  }
  
  // PRIORITY 3: Title contains EXACT client name (not partial word match)
  const exactNamePattern = new RegExp(`\\b${clientNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (exactNamePattern.test(sourceTitleLower)) {
    score += 30;
    reasons.push('exact_name_in_title');
  }
  
  // PRIORITY 4: Snippet contains exact client name with company context
  if (exactNamePattern.test(sourceSnippetLower)) {
    if (isAboutCompanyContext(sourceSnippetLower, clientName)) {
      score += 25;
      reasons.push('name_in_snippet_with_company_context');
    } else {
      score += 10; // Lower score if no company context
      reasons.push('name_in_snippet_no_context');
    }
  }
  
  // PRIORITY 5: LinkedIn profile from the company
  if (source.type === 'linkedin') {
    if (exactNamePattern.test(sourceTitleLower) || exactNamePattern.test(sourceSnippetLower)) {
      score += 20;
      reasons.push('linkedin_company_match');
    }
  }
  
  // PRIORITY 6: Known business/tech news sources mentioning the company
  const businessNewsDomains = ['techcrunch', 'forbes', 'bloomberg', 'reuters', 'wsj', 'businessinsider', 'venturebeat', 'crunchbase', 'linkedin', 'glassdoor', 'g2', 'capterra', 'trustradius'];
  const isBusinessNews = businessNewsDomains.some(d => sourceDomain.includes(d));
  
  if (isBusinessNews && exactNamePattern.test(sourceTitleLower + ' ' + sourceSnippetLower)) {
    score += 15;
    reasons.push('business_news_mention');
  }
  
  // Normalize score to 0-100
  const normalizedScore = Math.min(100, score);
  
  // STRICTER THRESHOLD: Require score >= 35 (was 25)
  const isRelevant = normalizedScore >= 35;
  
  return {
    isRelevant,
    relevanceScore: normalizedScore,
    reason: reasons.length > 0 ? reasons.join(', ') : 'no_match'
  };
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
      // Attach relevance score to source for later use
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
  // Base score from source validation ratio
  const validationRatio = sourceStats.total > 0 ? (sourceStats.valid / sourceStats.total) : 0;
  
  // Weighted score calculation
  let score = 0;
  
  // Source validation contributes 50%
  score += validationRatio * 50;
  
  // Average source relevance score contributes 30%
  score += (sourceStats.avgScore / 100) * 30;
  
  // Having sufficient sources contributes 10%
  const sufficientSources = Math.min(1, sourceStats.valid / 30); // 30+ sources = full points
  score += sufficientSources * 10;
  
  // RAG context contributes 10%
  const ragBonus = Math.min(1, ragDocsCount / 10); // 10+ RAG docs = full points
  score += ragBonus * 10;
  
  const roundedScore = Math.round(score);
  
  let level: 'high' | 'medium' | 'low';
  let explanation: string;
  
  if (roundedScore >= 70) {
    level = 'high';
    explanation = `High confidence: ${sourceStats.valid} verified sources found with strong relevance to ${sourceStats.total > 0 ? Math.round(validationRatio * 100) : 0}% match rate.`;
  } else if (roundedScore >= 40) {
    level = 'medium';
    explanation = `Medium confidence: ${sourceStats.valid} of ${sourceStats.total} sources verified. Some data may be from tangentially related sources.`;
  } else {
    level = 'low';
    explanation = `Low confidence: Limited verified sources (${sourceStats.valid} of ${sourceStats.total}). Results may include unrelated data.`;
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
    usage: ApiUsage;
    dateRestrict?: string;
  },
): Promise<{ title: string; link: string; snippet?: string }[]> {
  const { query, googleApiKey, googleCx, category, type, collector, usage, dateRestrict } = params;

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", googleApiKey);
    url.searchParams.set("cx", googleCx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "10");
    url.searchParams.set("safe", "active");
    if (dateRestrict) url.searchParams.set("dateRestrict", dateRestrict);

    const res = await fetch(url.toString());
    usage.googleSearch.calls++;
    
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

    usage.googleSearch.results += results.length;

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

async function callOpenAI(prompt: string, systemPrompt: string, openaiApiKey: string, usage: ApiUsage): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  // Estimate input tokens (rough: 4 chars per token)
  const inputTokenEstimate = Math.ceil((prompt.length + systemPrompt.length) / 4);

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
    
    // Track actual usage from response
    usage.openai.calls++;
    if (data.usage) {
      usage.openai.inputTokens += data.usage.prompt_tokens || inputTokenEstimate;
      usage.openai.outputTokens += data.usage.completion_tokens || 0;
    } else {
      usage.openai.inputTokens += inputTokenEstimate;
      const outputContent = data.choices?.[0]?.message?.content || "";
      usage.openai.outputTokens += Math.ceil(outputContent.length / 4);
    }
    
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGemini(prompt: string, systemPrompt: string, geminiApiKey: string, usage: ApiUsage): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  // Estimate input tokens
  const inputTokenEstimate = Math.ceil((prompt.length + systemPrompt.length) / 4);

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
    const outputContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Track usage (Gemini doesn't always return usage metadata)
    usage.gemini.calls++;
    usage.gemini.inputTokens += data.usageMetadata?.promptTokenCount || inputTokenEstimate;
    usage.gemini.outputTokens += data.usageMetadata?.candidatesTokenCount || Math.ceil(outputContent.length / 4);
    
    return outputContent;
  } finally {
    clearTimeout(timeoutId);
  }
}

// RAG: Generate embedding using OpenAI text-embedding-3-small
async function generateEmbedding(text: string, openaiApiKey: string, usage: ApiUsage): Promise<number[]> {
  try {
    const inputText = text.slice(0, 8000);
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: inputText,
      }),
    });

    usage.embedding.calls++;
    usage.embedding.tokens += Math.ceil(inputText.length / 4);

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI embedding error:", response.status, error);
      return [];
    }

    const data = await response.json();
    if (data.usage) {
      // Use actual token count if available
      usage.embedding.tokens = usage.embedding.tokens - Math.ceil(inputText.length / 4) + data.usage.total_tokens;
    }
    return data.data?.[0]?.embedding || [];
  } catch (e) {
    console.error("Embedding generation error:", e);
    return [];
  }
}

// RAG DIAGNOSTIC: Run full checklist to debug why 0 documents are returned
async function runRAGDiagnostics(supabaseServiceClient: any, openaiApiKey: string, usage: ApiUsage): Promise<void> {
  console.log("\n========== RAG DIAGNOSTICS START ==========\n");
  
  try {
    // CHECK 1: Count documents in external DB
    console.log("[DIAG 1] Counting documents in external DB...");
    const { data: countData, error: countError } = await supabaseServiceClient
      .from("documents")
      .select("id", { count: "exact", head: true });
    
    if (countError) {
      console.error("[DIAG 1] ❌ Count query failed:", JSON.stringify(countError));
    } else {
      console.log(`[DIAG 1] ✓ Documents table exists`);
    }

    // CHECK 2: Get sample documents and check embedding dimensions
    console.log("[DIAG 2] Checking sample documents and embedding dimensions...");
    const { data: sampleDocs, error: sampleError } = await supabaseServiceClient
      .from("documents")
      .select("id, content, metadata")
      .limit(3);
    
    if (sampleError) {
      console.error("[DIAG 2] ❌ Sample query failed:", JSON.stringify(sampleError));
    } else if (!sampleDocs || sampleDocs.length === 0) {
      console.error("[DIAG 2] ❌ Documents table is EMPTY - no documents found!");
    } else {
      console.log(`[DIAG 2] ✓ Found ${sampleDocs.length} sample documents`);
      for (const doc of sampleDocs) {
        const title = doc.metadata?.title || doc.metadata?.file_name || "Unknown";
        const contentLen = doc.content?.length || 0;
        console.log(`[DIAG 2]   - ID: ${doc.id}, Title: ${title}, Content length: ${contentLen}`);
      }
    }

    // CHECK 3: Test embedding generation
    console.log("[DIAG 3] Testing embedding generation...");
    const testQuery = "digital adoption ROI case study";
    const testEmbedding = await generateEmbedding(testQuery, openaiApiKey, usage);
    
    if (testEmbedding.length === 0) {
      console.error("[DIAG 3] ❌ Embedding generation failed!");
    } else {
      console.log(`[DIAG 3] ✓ Generated embedding with ${testEmbedding.length} dimensions`);
      console.log(`[DIAG 3]   First 5 values: [${testEmbedding.slice(0, 5).map(v => v.toFixed(6)).join(", ")}]`);
      console.log(`[DIAG 3]   Type check: isArray=${Array.isArray(testEmbedding)}, firstType=${typeof testEmbedding[0]}`);
    }

    // CHECK 4: Test RPC with generated embedding
    console.log("[DIAG 4] Testing match_documents RPC...");
    const { data: rpcData, error: rpcError } = await supabaseServiceClient.rpc("match_documents", {
      filter: {},
      match_count: 5,
      query_embedding: testEmbedding,
    });
    
    if (rpcError) {
      console.error("[DIAG 4] ❌ RPC error:", JSON.stringify(rpcError));
    } else {
      console.log(`[DIAG 4] ✓ RPC returned ${rpcData?.length || 0} documents`);
      if (rpcData && rpcData.length > 0) {
        for (const doc of rpcData.slice(0, 3)) {
          console.log(`[DIAG 4]   Match: similarity=${doc.similarity?.toFixed(4)}, id=${doc.id}`);
        }
      }
    }

    // CHECK 5: Try direct SQL query to check embedding column exists
    console.log("[DIAG 5] Checking if embedding column exists via direct select...");
    const { data: embCheck, error: embError } = await supabaseServiceClient
      .from("documents")
      .select("id")
      .limit(1);
    
    if (embError) {
      console.error("[DIAG 5] ❌ Embedding check failed:", JSON.stringify(embError));
    } else {
      console.log(`[DIAG 5] ✓ Can query documents table`);
    }

  } catch (e) {
    console.error("[DIAG] Exception during diagnostics:", e);
  }
  
  console.log("\n========== RAG DIAGNOSTICS END ==========\n");
}

// RAG: Search documents table for relevant content using match_documents RPC
// External DB signature: match_documents(filter, match_count, query_embedding)
async function searchRAGDocuments(
  query: string,
  openaiApiKey: string,
  supabaseServiceClient: any,
  usage: ApiUsage,
  matchCount: number = 10
): Promise<{ id: number; content: string; metadata: any; similarity: number }[]> {
  try {
    // Step 1: Generate embedding using OpenAI text-embedding-3-small (1536 dimensions)
    const embedding = await generateEmbedding(query, openaiApiKey, usage);
    if (embedding.length === 0) {
      console.log("[RAG] No embedding generated, skipping search");
      return [];
    }

    console.log(`[RAG] Generated embedding with ${embedding.length} dimensions for query: "${query.slice(0, 50)}..."`);
    console.log(`[RAG] Embedding first 3 values: [${embedding.slice(0, 3).map(v => v.toFixed(6)).join(", ")}]`);
    
    // Step 2: Vector search using match_documents RPC
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
      // Log top matches with metadata for debugging
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

// Extract a balanced JSON object from content using brace matching
function extractBalancedJson(content: string): string | null {
  const startIdx = content.indexOf('{');
  if (startIdx === -1) return null;
  
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIdx; i < content.length; i++) {
    const char = content[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          return content.slice(startIdx, i + 1);
        }
      }
    }
  }
  
  // If we didn't find balanced braces, try to repair by closing open braces
  // This handles cases where the AI output was truncated
  if (depth > 0) {
    let repaired = content.slice(startIdx);
    // Close any open strings first
    if (inString) repaired += '"';
    // Close open arrays/objects
    for (let d = 0; d < depth; d++) {
      repaired += '}';
    }
    return repaired;
  }
  
  return null;
}

function parseAIResponse(content: string, sectionKey?: string): { data: any; aiUrls: string[] } {
  const aiUrls = extractUrls(content);

  try {
    let jsonStr = content;
    
    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    // Use balanced brace extraction instead of greedy regex
    const extracted = extractBalancedJson(jsonStr);
    if (extracted) jsonStr = extracted;
    
    const parsed = JSON.parse(jsonStr);
    
    // If the section key is in the parsed data, extract it
    if (sectionKey && parsed[sectionKey]) {
      return { data: { [sectionKey]: parsed[sectionKey] }, aiUrls };
    }
    
    return { data: parsed, aiUrls };
  } catch (e) {
    // Fallback: try to find and parse just the section we need
    if (sectionKey) {
      try {
        // Look for the section key and extract its value
        const sectionRegex = new RegExp(`"${sectionKey}"\\s*:\\s*(\\{[\\s\\S]*)`);
        const match = content.match(sectionRegex);
        if (match) {
          const sectionContent = extractBalancedJson(match[1]);
          if (sectionContent) {
            const sectionParsed = JSON.parse(sectionContent);
            console.log(`[Parse] Recovered ${sectionKey} via section extraction`);
            return { data: { [sectionKey]: sectionParsed }, aiUrls };
          }
        }
      } catch (e2) {
        // Fall through to rawContent fallback
      }
    }
    
    console.error(`[Parse] JSON parse failed for ${sectionKey || 'unknown'}:`, e);
    console.error(`[Parse] Content preview: ${content.slice(0, 200)}...`);
    return { data: { rawContent: content }, aiUrls };
  }
}

const SECTIONS = [
  {
    key: "section1_executive_objectives",
    model: "openai" as const,
    system:
      "You are an elite account research analyst. Be exhaustive and evidence-based. Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section1_executive_objectives":{"oneGlanceSummary":{"relevanceScore":5,"relevanceRationale":"...","opportunityTier":"High/Medium/Low","opportunityRationale":"...","whyNow":"..."},"strategicBusinessGoals":[{"goal":"...","description":"...","source":"URL"}],"contextualChallenges":[{"challenge":"...","description":"...","source":"URL"}],"marketTrends":[{"trend":"...","impact":"...","source":"URL"}],"treasureMap":[{"frictionPoint":"...","opportunity":"..."}],"pendoFitStatement":"..."}}`,
  },
  {
    key: "section2_company_snapshot",
    model: "gemini" as const,
    system:
      "You are an elite account research analyst. CRITICAL: You MUST provide estimates for ALL companyInfo fields (employees, arrRevenue, keyRegions, monthlyWebTraffic). If exact data is unavailable, provide reasonable estimates based on company size, industry benchmarks, and funding. NEVER leave these fields empty - use formats like '~1,000-2,500', '$50M-100M ARR', 'North America, EMEA', '~500K-1M/mo'. Include rich detail (recent highlights, business model, ICP). Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section2_company_snapshot":{"companyInfo":{"company":"Name","industry":"Sector/Type","headquarters":"City, Country","employees":"~1,000-2,500 (REQUIRED - estimate if needed)","keyRegions":"NA, EMEA, APAC (REQUIRED - estimate primary markets)","arrRevenue":"$50M-100M ARR (REQUIRED - estimate based on funding/employees)","monthlyWebTraffic":"~500K-1M/mo (REQUIRED - estimate if SimilarWeb data unavailable)"},"missionVision":"...","recentHighlights":[{"date":"YYYY-MM-DD","event":"...","significance":"...","source":"URL"}],"businessModel":{"coreOfferings":["..."],"idealCustomerProfile":"...","goToMarket":"..."}}}`,
  },
  {
    key: "section3_revenue_strategy",
    model: "openai" as const,
    system:
      "You are an elite account research analyst. Provide depth (segments, pricing, monetization levers) and cite. Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section3_revenue_strategy":{"revenueModels":[{"model":"...","description":"...","source":"URL"}],"customerSegments":[{"segment":"...","description":"...","engagementModel":"..."}],"keyMonetizationLevers":[{"lever":"...","description":"..."}],"pricingStrategy":"..."}}`,
  },
  {
    key: "section4_tech_competitor",
    model: "gemini" as const,
    system:
      "You are an elite account research analyst. Provide a thorough stack and competitor view. Cite each stack/competitor claim. Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section4_tech_competitor":{"stackSummary":[{"category":"...","tool":"...","notes":"...","source":"URL"}],"competitorLandscape":[{"competitor":"...","strengths":"...","gaps":"...","source":"URL"}],"pendoWhitespaces":[{"whitespace":"...","description":"..."}]}}`,
  },
  {
    key: "section5_strategic_priorities",
    model: "openai" as const,
    system:
      "You are an elite account research analyst. Provide 6-10 priorities with explicit Pendo alignment and sources. Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section5_strategic_priorities":{"priorities":[{"priority":"...","description":"...","pendoAlignment":"...","source":"URL"}]}}`,
  },
  {
    key: "section6_pbos",
    model: "gemini" as const,
    system:
      "You are an elite account research analyst. Provide 4-6 PBOs with concrete proof points and personas. Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section6_pbos":{"pbos":[{"pboNumber":1,"title":"...","relevanceScore":5,"painPoint":"...","pendoSolution":"...","heroModules":["..."],"proofPoint":"...","strategicAlignment":"...","keyPersonas":["..."]}],"personaMappingDatabook":[{"persona":"...","alignedPBOs":[1,2]}]}}`,
  },
  {
    key: "section7_executives",
    model: "openai" as const,
    system:
      "You are an elite account research analyst. Provide 15-20 executives and VERIFIED linkedin URLs when available. Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section7_executives":{"keyExecutives":[{"name":"...","title":"...","linkedinUrl":"https://linkedin.com/in/...","focus":"...","pboAlignment":[1,2]}],"leadershipMappingSummary":[{"group":"...","focus":"...","alignedPBOs":"..."}]}}`,
  },
  {
    key: "section8_contact_strategy",
    model: "gemini" as const,
    system:
      "You are an elite account research analyst. Build a detailed contact strategy: personas, hooks, outreach narrative. Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section8_contact_strategy":{"strategicContactMapping":[{"name":"...","alignedPBOs":[1,2],"rationale":"..."}],"actionableOutreachGuidance":["..."],"contactNarrativeExample":{"subject":"...","body":"..."}}}`,
  },
  {
    key: "section9_final_bridge",
    model: "openai" as const,
    system:
      "You are an elite account research analyst. Create a crisp executive bridge summarizing insights and recommended next actions. Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section9_final_bridge":{"strategicPrioritiesSummary":["..."],"pbosSummary":[{"pboNumber":1,"title":"..."}],"stakeholdersSummary":[{"name":"...","role":"...","focus":"..."}],"closingSummary":"..."}}`,
  },
  {
    key: "section10_financial_trends",
    model: "gemini" as const,
    system:
      "You are an elite account research analyst. CRITICAL: You MUST provide EXACTLY 5 data points for BOTH revenueGrowth.data AND techSpend.data — one per year from 2021 to 2025. Do NOT duplicate years. Each year must appear EXACTLY ONCE. If exact figures are unavailable, ESTIMATE based on company size, funding rounds, employee count, and industry benchmarks. For techSpend, estimate 8-15% of revenue for SaaS companies. NEVER leave data arrays empty. Each data point must have year (string), numeric value (revenue or spend as number), and label (string). Use ONLY the provided sources. Return ONLY valid JSON.",
    schema:
      `{"section10_financial_trends":{"revenueGrowth":{"summary":"Description of revenue trajectory","data":[{"year":"2021","revenue":50,"label":"$50M"},{"year":"2022","revenue":75,"label":"$75M"},{"year":"2023","revenue":110,"label":"$110M"},{"year":"2024","revenue":150,"label":"$150M"},{"year":"2025","revenue":200,"label":"$200M"}],"cagr":"~25-40% (REQUIRED)","highlights":["Key growth driver 1","Key growth driver 2"]},"techSpend":{"summary":"Technology investment approach","data":[{"year":"2021","spend":5,"label":"$5M"},{"year":"2022","spend":8,"label":"$8M"},{"year":"2023","spend":12,"label":"$12M"},{"year":"2024","spend":18,"label":"$18M"},{"year":"2025","spend":25,"label":"$25M"}],"percentOfRevenue":"10-15% (REQUIRED - estimate based on SaaS benchmarks)","highlights":["R&D focus area 1","Tech investment priority 2"]},"fundingHistory":[{"date":"YYYY-MM","round":"Series X","amount":"$XXM","investors":"Investor names","source":"URL"}],"keyFinancialInsights":["Insight 1","Insight 2","Insight 3"]}}`,
  },
];

const CATEGORY_QUERIES: Array<{ category: string; type: SourceType; query: (p: { clientName: string; year: number }) => string; dateRestrict?: string }> = [
  { category: "overview", type: "web", query: ({ clientName }) => `${clientName} company overview about` },
  { category: "company_profile", type: "web", query: ({ clientName }) => `${clientName} company profile headquarters employees industry` },
  { category: "company_metrics", type: "web", query: ({ clientName }) => `${clientName} ARR revenue employees valuation SimilarWeb Crunchbase` },
  { category: "web_traffic", type: "web", query: ({ clientName }) => `${clientName} website traffic SimilarWeb monthly visitors` },
  { category: "financial", type: "web", query: ({ clientName, year }) => `${clientName} revenue financials ${year}` },
  { category: "arr_revenue", type: "web", query: ({ clientName, year }) => `${clientName} ARR annual recurring revenue ${year} million` },
  { category: "funding", type: "web", query: ({ clientName }) => `${clientName} funding valuation investment series` },
  { category: "annual_report", type: "web", query: ({ clientName }) => `${clientName} annual report 10-K SEC` },
  { category: "strategy", type: "web", query: ({ clientName, year }) => `${clientName} strategic priorities ${year}` },
  { category: "digital", type: "web", query: ({ clientName }) => `${clientName} digital transformation product analytics` },
  { category: "tech_stack", type: "web", query: ({ clientName }) => `${clientName} technology stack platform integrations` },
  { category: "competitors", type: "web", query: ({ clientName }) => `${clientName} competitors vs comparison` },
  { category: "leadership", type: "web", query: ({ clientName }) => `${clientName} executives leadership team CEO CTO CFO` },
  { category: "linkedin", type: "linkedin", query: ({ clientName }) => `site:linkedin.com/in ${clientName} executive VP director` },
  { category: "products", type: "web", query: ({ clientName }) => `${clientName} product launches features roadmap` },
  { category: "news", type: "news", query: ({ clientName, year }) => `${clientName} news announcements ${year}`, dateRestrict: "d30" },
  { category: "press_releases", type: "web", query: ({ clientName, year }) => `${clientName} press release acquisition partnership ${year}` },
];

const SECTION_CATEGORIES: Record<string, string[]> = {
  section1_executive_objectives: ["overview", "strategy", "digital", "news", "press_releases"],
  section2_company_snapshot: ["overview", "company_profile", "company_metrics", "web_traffic", "arr_revenue", "products", "news", "funding"],
  section3_revenue_strategy: ["financial", "arr_revenue", "annual_report", "products", "funding"],
  section4_tech_competitor: ["tech_stack", "competitors"],
  section5_strategic_priorities: ["strategy", "news", "annual_report", "press_releases"],
  section6_pbos: ["strategy", "digital", "products"],
  section7_executives: ["leadership", "linkedin"],
  section8_contact_strategy: ["leadership", "strategy", "news", "tech_stack"],  // Added tech_stack for whitespace context
  section9_final_bridge: ["overview", "strategy", "financial", "tech_stack", "competitors"],  // Added competitors for whitespace
  section10_financial_trends: ["financial", "arr_revenue", "funding", "annual_report", "news"],
};

// Map sections that should receive RAG whitespace context
const RAG_WHITESPACE_SECTIONS = ["section8_contact_strategy", "section9_final_bridge", "section4_tech_competitor"];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();
  
  // Initialize usage tracking
  const usage: ApiUsage = {
    openai: { calls: 0, inputTokens: 0, outputTokens: 0 },
    gemini: { calls: 0, inputTokens: 0, outputTokens: 0 },
    googleSearch: { calls: 0, results: 0 },
    serper: { calls: 0, results: 0 },
    embedding: { calls: 0, tokens: 0 },
  };

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

    const input: AccountInput = await req.json();
    const { clientName, clientWebsite, salesforceId, reportType } = input;

    if (!clientName || !clientWebsite || !reportType) {
      return new Response(
        JSON.stringify({ error: "clientName, clientWebsite, and reportType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const currentDate = new Date().toISOString().split("T")[0];
    const currentYear = new Date().getFullYear();

    console.log(`Starting chunked report for ${clientName} using OpenAI + Gemini + Google CSE + RAG`);

    // Create service client for local database operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create client for external RAG database (Pendo knowledge base)
    const externalSupabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalSupabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
    
    let ragDocs: { id: number; content: string; metadata: any; similarity: number }[] = [];
    if (externalSupabaseUrl && externalSupabaseServiceKey) {
      const externalSupabaseAdmin = createClient(externalSupabaseUrl, externalSupabaseServiceKey);
      
      // Run RAG diagnostics ONCE to debug the issue
      await runRAGDiagnostics(externalSupabaseAdmin, OPENAI_API_KEY, usage);
      
      // RAG: Search for Pendo-specific content by:
      // 1. Industry verticals and similar company use cases
      // 2. PBOs (Pendo Business Outcomes) 
      // 3. Executive persona content (CIO, CEO, CRO)
      // 4. Pendo whitespace & competitive positioning (for sections 8/9)
      const ragQueries = [
        // Industry/vertical case studies
        "technology software SaaS case study customer success Pendo",
        "financial services fintech banking digital transformation Pendo",
        "healthcare healthtech patient engagement digital adoption",
        "retail ecommerce customer experience product analytics",
        // PBO (Pendo Business Outcomes) queries
        "PBO business outcomes ROI metrics value realization Pendo",
        "reduce support tickets decrease time to value onboarding",
        "increase feature adoption user engagement retention NPS",
        // Executive persona queries - what CIO/CEO/CRO care about
        "CIO technology strategy digital transformation IT modernization",
        "CEO business growth revenue efficiency operational excellence",
        "CRO sales enablement revenue operations customer retention",
        "product-led growth PLG self-service adoption conversion",
        // PENDO WHITESPACE queries (for sections 8/9 contact strategy & bridge)
        "Pendo whitespace competitive gap opportunity displacement",
        "Pendo versus WalkMe Whatfix Amplitude Mixpanel comparison",
        "in-app guidance walkthrough analytics competitive advantage",
        "digital adoption platform DAP enterprise use case ROI",
        "Pendo Listen feedback session replay NPS competitive",
        "product analytics feature usage discovery insights expansion",
      ];
      
      console.log(`[RAG] Searching external knowledge base with ${ragQueries.length} industry/use-case queries...`);
      
      // Run all RAG queries in parallel and combine results
      // Using match_count=10 to capture relevant documents
      const ragPromises = ragQueries.map(query => 
        searchRAGDocuments(query, OPENAI_API_KEY, externalSupabaseAdmin, usage, 10)
      );
      
      const ragResults = await Promise.all(ragPromises);
      
      // Deduplicate by document ID
      const seenIds = new Set<number>();
      for (const docs of ragResults) {
        for (const doc of docs) {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            ragDocs.push(doc);
          }
        }
      }
      
      // Sort by similarity and take top 15
      ragDocs.sort((a, b) => b.similarity - a.similarity);
      ragDocs = ragDocs.slice(0, 15);
      
      console.log(`[RAG] Connected to external knowledge base, found ${ragDocs.length} unique documents across all queries`);
    } else {
      console.log("[RAG] External Supabase credentials not configured, skipping RAG search");
    }
    
    const ragContext = ragDocs.length > 0
      ? `\n=== INTERNAL KNOWLEDGE BASE (Pendo case studies & testimonials - USE FOR INTERPRETATION) ===
These are case studies and testimonials from SIMILAR companies in similar industries. The client name "${clientName}" will NOT appear in these documents.
Instead, use these to:
1. Find similar use cases from companies in the same sector
2. Extract PBO proof points and ROI metrics from comparable customers
3. Reference testimonials about similar challenges/solutions
4. Enrich your recommendations with real-world outcomes from analogous situations

${ragDocs
          .map((doc, i) => `[RAG ${i + 1}] ${doc.content.slice(0, 600)}${doc.content.length > 600 ? "..." : ""}`)
          .join("\n\n")}\n`
      : "";

    console.log(`[RAG] Using ${ragDocs.length} internal documents for context enrichment`);

    // 1) Research phase (Google official API first; Serper optional enrichment)
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
        usage,
      })
    );

    const serperPromises = SERPER_API_KEY
      ? [
        serperSearch(`${clientName} news announcements ${currentYear}`, SERPER_API_KEY, "news", collected, usage, "news"),
      ]
      : [];

    await Promise.all([...googlePromises, ...serperPromises]);

    const byUrl = new Map<string, CollectedSource>();
    for (const s of collected) {
      if (!s.url) continue;
      if (!byUrl.has(s.url)) byUrl.set(s.url, s);
    }
    const allDedupedSources = Array.from(byUrl.values());

    // Filter sources to keep only those relevant to the client
    console.log(`[Source Validation] Starting validation for ${allDedupedSources.length} sources...`);
    const { validSources: dedupedSources, stats: sourceValidationStats } = filterRelevantSources(
      allDedupedSources,
      clientName,
      clientWebsite
    );
    console.log(`[Source Validation] Kept ${sourceValidationStats.valid} of ${sourceValidationStats.total} sources (filtered ${sourceValidationStats.filtered} irrelevant)`);
    console.log(`[Source Validation] Average relevance score: ${sourceValidationStats.avgScore}%`);

    // Calculate overall report confidence
    const reportConfidence = calculateReportConfidence(sourceValidationStats, ragDocs.length);
    console.log(`[Report Confidence] Score: ${reportConfidence.score}% (${reportConfidence.level})`);

    const searchResults: Record<string, number> = {
      totalSources: allDedupedSources.length,
      validatedSources: dedupedSources.length,
      filteredSources: sourceValidationStats.filtered,
      ragDocuments: ragDocs.length,
    };
    for (const s of dedupedSources) {
      searchResults[s.category] = (searchResults[s.category] || 0) + 1;
      if (s.type === "linkedin") searchResults.linkedInValidated = (searchResults.linkedInValidated || 0) + 1;
      if (s.type === "news") searchResults.news = (searchResults.news || 0) + 1;
    }

    // 2) Build per-section source buckets (using validated sources only)
    const sourcesBySection: Record<string, CollectedSource[]> = {};
    for (const section of SECTIONS) {
      const cats = SECTION_CATEGORIES[section.key] || [];
      sourcesBySection[section.key] = dedupedSources.filter((s) => cats.includes(s.category)).slice(0, 40);
    }

    const globalContext = `
=== ACCOUNT RESEARCH ===
Client: ${clientName}
Website: ${clientWebsite}
${salesforceId ? `Salesforce ID: ${salesforceId}` : "(Prospect)"}
Analysis Date: ${currentDate}
${ragContext}
Rules:
- Use ONLY the provided sources for factual claims.
- Leverage internal knowledge base insights for Pendo-specific recommendations when available.
- Every claim that could be challenged must include a source URL (use the "source" field).
- Return ONLY valid JSON. Do not wrap with markdown.
`;

    console.log("Generating all 10 sections in parallel...");

    const sectionPromises = SECTIONS.map(async (section) => {
      const sources = sourcesBySection[section.key] || [];
      const sourcesBlock = sources
        .slice(0, 30)
        .map((s, i) => `(${i + 1}) ${s.title}\n    ${s.snippet || ""}\n    URL: ${s.url}`)
        .join("\n\n");

      // Add extra Pendo whitespace context for sections 8 and 9
      let whitespaceSuffix = "";
      if (RAG_WHITESPACE_SECTIONS.includes(section.key) && ragDocs.length > 0) {
        whitespaceSuffix = `\n\n=== PENDO WHITESPACE INTELLIGENCE ===
Use the internal knowledge base above to identify:
- Competitive gaps where Pendo excels vs WalkMe, Whatfix, Amplitude, Mixpanel
- Unique Pendo capabilities (in-app guides, analytics, Listen, feedback, session replay)
- Proof points and ROI metrics from similar customer deployments
- Strategic hooks for outreach based on whitespace opportunities
`;
      }

      const prompt = `${globalContext}\n=== SOURCES FOR THIS SECTION (${sources.length}) ===\n${sourcesBlock}${whitespaceSuffix}\n\nGenerate this section using the schema below.\n${section.schema}`;

      try {
        const content = section.model === "openai"
          ? await callOpenAI(prompt, section.system, OPENAI_API_KEY, usage)
          : await callGemini(prompt, section.system, GEMINI_API_KEY, usage);

        return { key: section.key, model: section.model, content } as const;
      } catch (e: any) {
        return { key: section.key, model: section.model, error: String(e?.message || e) } as const;
      }
    });

    const results = await Promise.all(sectionPromises);

    // 3) Merge results AND persist sources separately per section
    const reportData: Record<string, any> = {};
    const modelsUsed = new Set<string>();

    for (const r of results) {
      if ("content" in r && r.content) {
        const parsed = parseAIResponse(r.content, r.key);

        if (parsed.data && !parsed.data.rawContent) {
          const sectionValue = parsed.data?.[r.key] ?? parsed.data;
          reportData[r.key] = sectionValue;
        } else {
          reportData[r.key] = { rawContent: r.content };
        }

        if (parsed.aiUrls.length) {
          const existing = sourcesBySection[r.key] || [];
          const seen = new Set(existing.map((s) => s.url));
          for (const u of parsed.aiUrls) {
            if (seen.has(u)) continue;
            existing.push({
              title: u,
              url: u,
              snippet: "",
              query: "ai_citation",
              type: u.includes("linkedin.com/in/") ? "linkedin" : "web",
              category: "ai_citation",
              provider: "google",
            });
            seen.add(u);
          }
          sourcesBySection[r.key] = existing;
        }

        modelsUsed.add(r.model);
        console.log(`✓ ${r.key} (${r.model})`);
      } else {
        reportData[r.key] = { error: (r as any).error || "Unknown error" };
        console.error(`✗ ${r.key} (${(r as any).model}): ${(r as any).error}`);
      }
    }

    // 4) Aggregate sources
    const flatAll = Object.values(sourcesBySection).flat();
    const flatDedup = Array.from(new Map(flatAll.map((s) => [s.url, s])).values());

    const allLinkedInProfiles = flatDedup
      .filter((s) => s.type === "linkedin" && s.url.includes("linkedin.com/in/"))
      .slice(0, 50)
      .map((s) => ({
        name: s.title,
        title: "",
        company: clientName,
        url: s.url,
        confidence: s.provider === "google" ? 70 : 50,
      }));

    // Calculate costs
    const costs = calculateCosts(usage);
    const generationTimeSeconds = Math.round((Date.now() - startTime) / 1000);

    reportData._metadata = {
      generatedAt: currentDate,
      clientName,
      clientWebsite,
      reportType,
      models: Array.from(modelsUsed),
      searchResults,
      ragDocumentsUsed: ragDocs.length,
      sourcesBySection,
      flatSources: flatDedup.map((s) => ({ title: s.title, url: s.url, relevanceScore: (s as any).relevanceScore || 0 })),
      allLinkedInProfiles,
      apiUsage: usage,
      costs,
      generationTimeSeconds,
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

    // Save report to database
    const { data: saved, error: saveError } = await supabaseAdmin
      .from("account_intelligence_reports")
      .insert({
        user_id: user.id,
        client_name: clientName,
        client_website: clientWebsite,
        salesforce_id: salesforceId || null,
        report_type: reportType,
        report_data: reportData,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving report:", saveError);
    }

    // Save usage analytics to separate table
    const { error: usageError } = await supabaseAdmin
      .from("account_intelligence_usage")
      .insert({
        report_id: saved?.id || null,
        user_id: user.id,
        client_name: clientName,
        report_type: reportType,
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
        total_cost_usd: costs.total,
        generation_time_seconds: generationTimeSeconds,
      });

    if (usageError) {
      console.error("Error saving usage analytics:", usageError);
    }

    console.log(`Report generated for ${clientName}. Sections: ${SECTIONS.length}. Sources: ${flatDedup.length}. RAG docs: ${ragDocs.length}. Time: ${generationTimeSeconds}s. Cost: $${costs.total.toFixed(4)}`);

    return new Response(
      JSON.stringify({ success: true, reportId: saved?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
