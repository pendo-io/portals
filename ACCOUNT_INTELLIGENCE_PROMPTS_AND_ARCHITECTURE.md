# Account Intelligence Report Generation - Complete Documentation

This document contains the full architecture, prompts, data sources, and tools used for all Account Intelligence report types. Use this to recreate the system in another project.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Required API Keys & Secrets](#required-api-keys--secrets)
3. [Account Snapshot](#1-account-snapshot)
4. [Account Overview (Full Intelligence Report)](#2-account-overview-full-intelligence-report)
5. [Value Hypothesis](#3-value-hypothesis)
6. [Strategy Map](#4-strategy-map)
7. [Common Utilities & Helper Functions](#common-utilities--helper-functions)
8. [Source Validation & Relevance Scoring](#source-validation--relevance-scoring)
9. [RAG Integration](#rag-integration)
10. [Database Schema](#database-schema)

---

## Architecture Overview

### High-Level Flow
```
User Input (Client Name, Website, Salesforce ID)
    │
    ▼
┌─────────────────────────────────────────┐
│         PARALLEL RESEARCH PHASE          │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │Google CSE   │  │ Serper.dev      │   │
│  │(Primary)    │  │ (Secondary)     │   │
│  └─────────────┘  └─────────────────┘   │
│           │               │              │
│           ▼               ▼              │
│      Source Collection & Validation      │
│      (35% minimum relevance score)       │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│         RAG ENRICHMENT (Optional)        │
│  ┌─────────────────────────────────────┐ │
│  │ External Supabase Vector DB         │ │
│  │ - OpenAI text-embedding-3-small     │ │
│  │ - 1536 dimensions                   │ │
│  │ - Pendo whitespace intelligence     │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│    PARALLEL SECTION GENERATION           │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ OpenAI      │  │ Google Gemini   │   │
│  │ gpt-5.2     │  │ gemini-2.5-pro  │   │
│  └─────────────┘  └─────────────────┘   │
│           │               │              │
│           ▼               ▼              │
│      Alternating Model Assignment        │
│      (Load balancing + quality)          │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│         REPORT ASSEMBLY                  │
│  - Merge section results                 │
│  - Calculate relevance score             │
│  - Save to database                      │
│  - Return report ID (not full payload)   │
└─────────────────────────────────────────┘
```

### Key Design Patterns

1. **Parallel Chunked Generation**: Reports are split into sections generated concurrently to prevent gateway timeouts (300s limit)
2. **Alternating LLM Pattern**: Sections alternate between OpenAI and Gemini for load balancing and quality
3. **Dual Search Strategy**: Google Custom Search (primary) + Serper.dev (secondary backup)
4. **Strict Source Validation**: 35% minimum relevance score, domain filtering
5. **RAG Enrichment**: External vector DB for Pendo-specific case studies and whitespace intelligence

---

## Required API Keys & Secrets

```bash
# LLM Models
OPENAI_API_KEY=           # For GPT-5.2 and text-embedding-3-small
GEMINI_API_KEY=           # For Gemini 2.5 Pro/Flash

# Search APIs
GOOGLE_API_KEY=           # Google Custom Search API
GOOGLE_CX=                # Google Custom Search Engine ID
SERPER_API_KEY=           # Serper.dev API (optional, backup)

# Supabase (auto-configured in Lovable Cloud)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# External RAG Database (optional)
EXTERNAL_SUPABASE_URL=           # External vector DB URL
EXTERNAL_SUPABASE_SERVICE_KEY=   # External vector DB service key
```

---

## 1. Account Snapshot

**Purpose**: Quick 20-second research brief with company basics, financials, news, hiring, and optional audio podcast.

**Edge Function**: `supabase/functions/account-snapshot/index.ts`

**Timeout**: 300 seconds

### Search Queries (50+ queries)

```typescript
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
```

### System Prompt

```typescript
const systemPrompt = `You are a B2B sales intelligence analyst creating a lean, executive-level account snapshot for ${clientName}.
Focus on actionable facts. Be concise. No fluff. Use bullet points.
If exact data is unavailable, provide reasonable AI estimates (e.g., "$50M-100M ARR") clearly marked as estimates.
For recent news, focus on events from the LAST 2 MONTHS (December 2025, January 2026, February 2026).
IMPORTANT: Include 5-7 news items. Classify major positive events (big funding, acquisitions, major partnerships, awards) as "big_win" and major negative events (layoffs, lawsuits, CEO departures, security breaches) as "big_loss". Use "positive", "neutral", "negative" for regular news.
For hiring data, identify specific departments/roles being hired and overall hiring trends.
Return ONLY valid JSON matching the schema exactly.`;
```

### Output JSON Schema

```json
{
  "companySnapshot": {
    "companyName": "string - official company name",
    "description": "string - 2-3 sentence company description with key value proposition",
    "industry": "string - primary industry",
    "subIndustry": "string - specific market segment",
    "founded": "string - year or 'Unknown'",
    "headquarters": "string - city, state/country",
    "employeeCount": "string - e.g., '500-1,000' or '~2,500'",
    "employeeGrowth": "string - e.g., '+15% YoY' or 'Stable'",
    "website": "string"
  },
  "financials": {
    "isPublic": "boolean - true if publicly traded",
    "stockTicker": "string or null - e.g., 'NYSE: AAPL'",
    "annualRevenue": "string - e.g., '$500M-1B' or '$2.3B'",
    "revenueGrowth": "string - e.g., '+25% YoY'",
    "fundingTotal": "string - total funding raised",
    "lastFundingRound": "string - e.g., 'Series D - $150M (March 2024)'",
    "valuation": "string - last known valuation",
    "investors": ["array of key investor names"]
  },
  "recentNews": [
    {
      "date": "YYYY-MM-DD",
      "headline": "string",
      "summary": "string - 1-2 sentences",
      "sentiment": "big_win | big_loss | positive | neutral | negative",
      "source": "string - source name"
    }
  ],
  "hiring": {
    "isActivelyHiring": "boolean",
    "hiringTrend": "string - 'Growing rapidly', 'Steady', 'Slowing', 'Restructuring'",
    "totalOpenRoles": "number or estimate",
    "hotDepartments": ["array - e.g., 'Engineering', 'Sales', 'Product'"],
    "notableRoles": ["array - specific interesting open positions"],
    "recentHiringNews": "string - any notable hiring/layoff news"
  },
  "salesIntel": {
    "buyingSignals": ["array of signals indicating buying potential"],
    "potentialChallenges": ["array of potential objections or challenges"],
    "recommendedApproach": "string - suggested sales approach"
  },
  "marketPosition": {
    "segment": "string - e.g., 'Enterprise', 'Mid-Market', 'SMB'",
    "targetCustomers": "string - who they sell to",
    "differentiator": "string - key competitive advantage",
    "competitors": ["array of main competitors"]
  }
}
```

### Podcast Generation (Optional)

Uses OpenAI TTS with `tts-1-hd` model and `coral` voice. Script is ~550 words for 4-minute audio.

```typescript
// Podcast script structure:
// 1. GREETING (1 sentence)
// 2. COMPANY OVERVIEW (8-10 sentences)
// 3. TRANSITION (1 sentence)
// 4. RECENT NEWS SECTION (8-10 sentences)
// 5. THE PENDO PLAY (4-5 sentences)
// 6. CLOSING (2 sentences)
```

---

## 2. Account Overview (Full Intelligence Report)

**Purpose**: Comprehensive 10-section strategic executive brief with deep research.

**Edge Function**: `supabase/functions/account-intelligence/index.ts`

**Timeout**: 300 seconds

### 10 Sections with Prompts

#### Section 1: Executive Objectives
```typescript
{
  key: "section1_executive_objectives",
  model: "openai",
  system: "You are an elite account research analyst. Be exhaustive and evidence-based. Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section1_executive_objectives": {
      "oneGlanceSummary": {
        "relevanceScore": 5,
        "relevanceRationale": "...",
        "opportunityTier": "High/Medium/Low",
        "opportunityRationale": "...",
        "whyNow": "..."
      },
      "strategicBusinessGoals": [{"goal":"...", "description":"...", "source":"URL"}],
      "contextualChallenges": [{"challenge":"...", "description":"...", "source":"URL"}],
      "marketTrends": [{"trend":"...", "impact":"...", "source":"URL"}],
      "treasureMap": [{"frictionPoint":"...", "opportunity":"..."}],
      "pendoFitStatement": "..."
    }
  }`
}
```

#### Section 2: Company Snapshot
```typescript
{
  key: "section2_company_snapshot",
  model: "gemini",
  system: "You are an elite account research analyst. CRITICAL: You MUST provide estimates for ALL companyInfo fields (employees, arrRevenue, keyRegions, monthlyWebTraffic). If exact data is unavailable, provide reasonable estimates based on company size, industry benchmarks, and funding. NEVER leave these fields empty - use formats like '~1,000-2,500', '$50M-100M ARR', 'North America, EMEA', '~500K-1M/mo'. Include rich detail (recent highlights, business model, ICP). Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section2_company_snapshot": {
      "companyInfo": {
        "company": "Name",
        "industry": "Sector/Type",
        "headquarters": "City, Country",
        "employees": "~1,000-2,500 (REQUIRED - estimate if needed)",
        "keyRegions": "NA, EMEA, APAC (REQUIRED - estimate primary markets)",
        "arrRevenue": "$50M-100M ARR (REQUIRED - estimate based on funding/employees)",
        "monthlyWebTraffic": "~500K-1M/mo (REQUIRED - estimate if SimilarWeb data unavailable)"
      },
      "missionVision": "...",
      "recentHighlights": [{"date":"YYYY-MM-DD", "event":"...", "significance":"...", "source":"URL"}],
      "businessModel": {
        "coreOfferings": ["..."],
        "idealCustomerProfile": "...",
        "goToMarket": "..."
      }
    }
  }`
}
```

#### Section 3: Revenue Strategy
```typescript
{
  key: "section3_revenue_strategy",
  model: "openai",
  system: "You are an elite account research analyst. Provide depth (segments, pricing, monetization levers) and cite. Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section3_revenue_strategy": {
      "revenueModels": [{"model":"...", "description":"...", "source":"URL"}],
      "customerSegments": [{"segment":"...", "description":"...", "engagementModel":"..."}],
      "keyMonetizationLevers": [{"lever":"...", "description":"..."}],
      "pricingStrategy": "..."
    }
  }`
}
```

#### Section 4: Tech & Competitor
```typescript
{
  key: "section4_tech_competitor",
  model: "gemini",
  system: "You are an elite account research analyst. Provide a thorough stack and competitor view. Cite each stack/competitor claim. Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section4_tech_competitor": {
      "stackSummary": [{"category":"...", "tool":"...", "notes":"...", "source":"URL"}],
      "competitorLandscape": [{"competitor":"...", "strengths":"...", "gaps":"...", "source":"URL"}],
      "pendoWhitespaces": [{"whitespace":"...", "description":"..."}]
    }
  }`
}
```

#### Section 5: Strategic Priorities
```typescript
{
  key: "section5_strategic_priorities",
  model: "openai",
  system: "You are an elite account research analyst. Provide 6-10 priorities with explicit Pendo alignment and sources. Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section5_strategic_priorities": {
      "priorities": [{"priority":"...", "description":"...", "pendoAlignment":"...", "source":"URL"}]
    }
  }`
}
```

#### Section 6: PBOs (Potential Business Outcomes)
```typescript
{
  key: "section6_pbos",
  model: "gemini",
  system: "You are an elite account research analyst. Provide 4-6 PBOs with concrete proof points and personas. Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section6_pbos": {
      "pbos": [{
        "pboNumber": 1,
        "title": "...",
        "relevanceScore": 5,
        "painPoint": "...",
        "pendoSolution": "...",
        "heroModules": ["..."],
        "proofPoint": "...",
        "strategicAlignment": "...",
        "keyPersonas": ["..."]
      }],
      "personaMappingDatabook": [{"persona":"...", "alignedPBOs":[1,2]}]
    }
  }`
}
```

#### Section 7: Executives
```typescript
{
  key: "section7_executives",
  model: "openai",
  system: "You are an elite account research analyst. Provide 15-20 executives and VERIFIED linkedin URLs when available. Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section7_executives": {
      "keyExecutives": [{
        "name": "...",
        "title": "...",
        "linkedinUrl": "https://linkedin.com/in/...",
        "focus": "...",
        "pboAlignment": [1,2]
      }],
      "leadershipMappingSummary": [{"group":"...", "focus":"...", "alignedPBOs":"..."}]
    }
  }`
}
```

#### Section 8: Contact Strategy
```typescript
{
  key: "section8_contact_strategy",
  model: "gemini",
  system: "You are an elite account research analyst. Build a detailed contact strategy: personas, hooks, outreach narrative. Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section8_contact_strategy": {
      "strategicContactMapping": [{"name":"...", "alignedPBOs":[1,2], "rationale":"..."}],
      "actionableOutreachGuidance": ["..."],
      "contactNarrativeExample": {"subject":"...", "body":"..."}
    }
  }`
}
```

#### Section 9: Final Bridge
```typescript
{
  key: "section9_final_bridge",
  model: "openai",
  system: "You are an elite account research analyst. Create a crisp executive bridge summarizing insights and recommended next actions. Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section9_final_bridge": {
      "strategicPrioritiesSummary": ["..."],
      "pbosSummary": [{"pboNumber":1, "title":"..."}],
      "stakeholdersSummary": [{"name":"...", "role":"...", "focus":"..."}],
      "closingSummary": "..."
    }
  }`
}
```

#### Section 10: Financial Trends
```typescript
{
  key: "section10_financial_trends",
  model: "gemini",
  system: "You are an elite account research analyst. CRITICAL: You MUST provide 5-year numerical data arrays for BOTH revenueGrowth.data AND techSpend.data. If exact figures are unavailable, ESTIMATE based on company size, funding rounds, employee count, and industry benchmarks. For techSpend, estimate 8-15% of revenue for SaaS companies. NEVER leave data arrays empty - always provide 5 years of realistic numerical estimates (2021-2025). Each data point must have year, numeric value (revenue or spend), and label. Use ONLY the provided sources. Return ONLY valid JSON.",
  schema: `{
    "section10_financial_trends": {
      "revenueGrowth": {
        "summary": "Description of revenue trajectory",
        "data": [
          {"year":"2021", "revenue":50, "label":"$50M"},
          {"year":"2022", "revenue":75, "label":"$75M"},
          {"year":"2023", "revenue":110, "label":"$110M"},
          {"year":"2024", "revenue":150, "label":"$150M"},
          {"year":"2025", "revenue":200, "label":"$200M"}
        ],
        "cagr": "~25-40% (REQUIRED)",
        "highlights": ["Key growth driver 1", "Key growth driver 2"]
      },
      "techSpend": {
        "summary": "Technology investment approach",
        "data": [
          {"year":"2021", "spend":5, "label":"$5M"},
          {"year":"2022", "spend":8, "label":"$8M"},
          {"year":"2023", "spend":12, "label":"$12M"},
          {"year":"2024", "spend":18, "label":"$18M"},
          {"year":"2025", "spend":25, "label":"$25M"}
        ],
        "percentOfRevenue": "10-15% (REQUIRED - estimate based on SaaS benchmarks)",
        "highlights": ["R&D focus area 1", "Tech investment priority 2"]
      },
      "fundingHistory": [{"date":"YYYY-MM", "round":"Series X", "amount":"$XXM", "investors":"Investor names", "source":"URL"}],
      "keyFinancialInsights": ["Insight 1", "Insight 2", "Insight 3"]
    }
  }`
}
```

### Search Query Categories (40+ queries)

```typescript
const CATEGORY_QUERIES = [
  { category: "overview", type: "web", query: ({ clientName }) => `${clientName} company overview about` },
  { category: "overview2", type: "web", query: ({ clientName }) => `${clientName} Wikipedia about` },
  { category: "businessModel", type: "web", query: ({ clientName }) => `${clientName} business model revenue` },
  { category: "customers", type: "web", query: ({ clientName }) => `${clientName} customers case studies` },
  { category: "financials", type: "web", query: ({ clientName, year }) => `${clientName} revenue ARR funding ${year}` },
  { category: "financials2", type: "web", query: ({ clientName }) => `${clientName} valuation investors funding rounds` },
  { category: "10k", type: "web", query: ({ clientName, year }) => `${clientName} 10-K SEC filing ${year}` },
  { category: "crunchbase", type: "web", query: ({ clientName }) => `site:crunchbase.com ${clientName}` },
  { category: "tech", type: "web", query: ({ clientName }) => `${clientName} technology stack platform integrations` },
  { category: "competitors", type: "web", query: ({ clientName }) => `${clientName} competitors alternatives vs comparison` },
  { category: "priorities", type: "web", query: ({ clientName, year }) => `${clientName} strategic priorities initiatives ${year}` },
  { category: "digitalTx", type: "web", query: ({ clientName }) => `${clientName} digital transformation product-led growth` },
  { category: "cxStrategy", type: "web", query: ({ clientName }) => `${clientName} customer experience strategy CX` },
  { category: "news", type: "news", query: ({ clientName }) => `${clientName} news announcement 2025 2026`, dateRestrict: "d90" },
  { category: "newsDeeper", type: "news", query: ({ clientName }) => `${clientName} product launch partnership acquisition` },
  { category: "earnings", type: "web", query: ({ clientName }) => `${clientName} earnings call transcript Q4 2024` },
  { category: "linkedin", type: "web", query: ({ clientName }) => `site:linkedin.com/in ${clientName} CEO CTO CPO VP` },
  { category: "linkedin2", type: "web", query: ({ clientName }) => `site:linkedin.com/in ${clientName} Chief Officer VP Director` },
  { category: "executives", type: "web", query: ({ clientName }) => `${clientName} leadership team executives management` },
  { category: "culture", type: "web", query: ({ clientName }) => `${clientName} company culture values glassdoor` },
  { category: "hiring", type: "web", query: ({ clientName }) => `${clientName} careers hiring jobs open positions` },
  { category: "pricing", type: "web", query: ({ clientName }) => `${clientName} pricing plans enterprise` },
  { category: "g2", type: "web", query: ({ clientName }) => `site:g2.com ${clientName}` },
  { category: "similarweb", type: "web", query: ({ clientName }) => `site:similarweb.com ${clientName} traffic` },
  { category: "owler", type: "web", query: ({ clientName }) => `site:owler.com ${clientName}` },
  { category: "pitchbook", type: "web", query: ({ clientName }) => `site:pitchbook.com ${clientName}` },
  // ... more queries for comprehensive coverage
];
```

---

## 3. Value Hypothesis

**Purpose**: Structured value proposition with Corporate Objective, Key Initiatives, Desired Outcomes, and Pendo-Relevant Criteria.

**Edge Function**: `supabase/functions/value-hypothesis/index.ts`

**Timeout**: 300 seconds

### 6 Sections with Prompts

#### Section 1: Value Hypothesis Statement
```typescript
{
  key: "valueHypothesis",
  model: "openai",
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
  }`
}
```

#### Section 2: Key Initiatives
```typescript
{
  key: "keyInitiatives",
  model: "gemini",
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
  }`
}
```

#### Section 3: Desired Outcomes
```typescript
{
  key: "desiredOutcomes",
  model: "openai",
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
      }
    ]
  }`
}
```

#### Section 4: Pendo-Relevant Criteria
```typescript
{
  key: "pendoCriteria",
  model: "gemini",
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
  }`
}
```

#### Section 5: Corporate Objectives
```typescript
{
  key: "corporateObjectives",
  model: "openai",
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
  }`
}
```

#### Section 6: Sources
```typescript
{
  key: "sources",
  model: "gemini",
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
  }`
}
```

### Search Query Categories

```typescript
const CATEGORY_QUERIES = [
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

// Section to Category Mapping
const SECTION_CATEGORIES = {
  valueHypothesis: ["sec_filing", "sec_10k_2024", "ceo_letter", "corporate_goals", "strategy"],
  keyInitiatives: ["strategy", "transformation", "product_strategy", "news_recent", "press_releases", "partnership"],
  desiredOutcomes: ["kpi_metrics", "retention_metrics", "growth_metrics", "earnings_call", "earnings_q4", "earnings_q3", "financial_metrics"],
  pendoCriteria: ["product_strategy", "customer_experience", "product_analytics", "transformation"],
  corporateObjectives: ["sec_filing", "sec_10k_2024", "sec_10k_2023", "annual_report", "investor_presentation", "ceo_letter", "corporate_goals"],
  sources: ["sec_filing", "sec_10k_2024", "annual_report", "earnings_call", "news_recent", "press_releases"],
};
```

---

## 4. Strategy Map

**Purpose**: Visual strategy map with Vision, Leadership Mandates, Transformation Priorities, Desired Outcomes, and Use Cases.

**Edge Function**: `supabase/functions/strategy-map/index.ts`

**Timeout**: 300 seconds

### 6 Sections with Prompts

#### Vision
```typescript
{
  model: "openai",
  systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales.
Generate a compelling Vision statement that captures the client's aspirational goal.
Return ONLY valid JSON matching this schema:
{
  "vision": "A single compelling vision statement (1-2 sentences) describing the company's aspirational goal for customer engagement and value delivery"
}`
}
```

#### Leadership Mandates
```typescript
{
  model: "gemini",
  systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales.
Identify 3 Enterprise Leadership Mandates - high-level strategic imperatives from the C-suite.
These should be bold, action-oriented statements like "EXPAND MARKET PRESENCE GLOBALLY" or "DRIVE GROWTH THROUGH INNOVATION".
Return ONLY valid JSON matching this schema:
{
  "mandates": [
    { "title": "BOLD ACTION PHRASE", "subtitle": "Supporting context in 2-4 words" }
  ]
}`
}
```

#### Transformation Priorities
```typescript
{
  model: "openai",
  systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales.
Identify 3 Transformation Priorities - the strategic initiatives that enable the leadership mandates.
These should be concise transformation themes like "Predictive, proactive customer engagement" or "Measurable digital adoption and onboarding".
Return ONLY valid JSON matching this schema:
{
  "priorities": [
    { "priority": "Transformation priority statement (5-8 words)" }
  ]
}`
}
```

#### Desired Outcomes
```typescript
{
  model: "gemini",
  systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales.
Identify 4 Desired Business Outcomes - measurable business results the company wants to achieve.
These should be outcome-focused statements like "Improve SMB account retention through automated, data-driven risk identification" or "Reduce onboarding cycle times and increase feature activation rates".
Return ONLY valid JSON matching this schema:
{
  "outcomes": [
    { "outcome": "Detailed business outcome statement (15-25 words)" }
  ]
}`
}
```

#### Use Cases
```typescript
{
  model: "openai",
  systemPrompt: `You are a strategic business analyst creating a Strategy Map for enterprise sales engagement with Pendo.
Identify 7 specific Use Cases that show how Pendo's platform can help achieve the desired outcomes.
These should be actionable use cases like "Automated onboarding journeys combining in-app and email triggers" or "Real-time churn and upsell alerts surfaced through Salesforce".
Return ONLY valid JSON matching this schema:
{
  "useCases": [
    { "useCase": "Specific Pendo-relevant use case (8-12 words)" }
  ]
}`
}
```

#### Sources
```typescript
{
  model: "gemini",
  systemPrompt: `You are a research analyst. Review the provided sources and select the 5 most relevant and authoritative ones for this Strategy Map.
Return ONLY valid JSON matching this schema:
{
  "sources": [
    { "title": "Source title", "url": "Source URL" }
  ]
}`
}
```

### Search Query Categories

```typescript
const CATEGORY_QUERIES = [
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

// Section to Category Mapping
const SECTION_CATEGORIES = {
  vision: ["corporate_goals", "ceo_letter", "strategy", "transformation"],
  leadershipMandates: ["ceo_letter", "corporate_goals", "strategy", "growth_strategy", "market_expansion"],
  transformationPriorities: ["transformation", "digital_adoption", "customer_experience", "product_strategy"],
  desiredOutcomes: ["customer_success", "growth_strategy", "expansion_revenue", "operational", "cost_optimization", "onboarding"],
  useCases: ["digital_adoption", "product_analytics", "customer_experience", "onboarding", "customer_success", "expansion_revenue"],
  sources: ["news_recent", "press_releases", "corporate_goals", "strategy"],
};
```

---

## Common Utilities & Helper Functions

### Google Custom Search API

```typescript
async function googleCustomSearch(params: {
  query: string;
  googleApiKey: string;
  googleCx: string;
  category: string;
  type: "web" | "news";
  collector: CollectedSource[];
  dateRestrict?: string;
}): Promise<{ title: string; link: string; snippet?: string }[]> {
  const { query, googleApiKey, googleCx, category, type, collector, dateRestrict } = params;

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", googleApiKey);
  url.searchParams.set("cx", googleCx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  url.searchParams.set("safe", "active");
  if (dateRestrict) url.searchParams.set("dateRestrict", dateRestrict);

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  const results = items.map((it) => ({
    title: String(it.title || ""),
    link: cleanUrl(String(it.link || "")),
    snippet: String(it.snippet || ""),
  })).filter((r) => r.title && r.link);

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

  return results;
}
```

### Serper.dev Search API (Backup)

```typescript
async function serperSearch(
  query: string,
  serperApiKey: string,
  category: string,
  collector: CollectedSource[],
  searchType: "search" | "news" = "search"
): Promise<any[]> {
  const response = await fetch(`https://google.serper.dev/${searchType}`, {
    method: "POST",
    headers: {
      "X-API-KEY": serperApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 10 }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const results = searchType === "news"
    ? (data.news || []).map((r) => ({ title: r.title, link: r.link, snippet: r.snippet }))
    : (data.organic || []).map((r) => ({ title: r.title, link: r.link, snippet: r.snippet }));

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

  return results;
}
```

### OpenAI API Call

```typescript
async function callOpenAI(prompt: string, systemPrompt: string, openaiApiKey: string): Promise<string> {
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

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Gemini API Call

```typescript
async function callGemini(prompt: string, systemPrompt: string, geminiApiKey: string): Promise<string> {
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
      }
    );

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## Source Validation & Relevance Scoring

### Domain Filtering

```typescript
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
```

### Relevance Scoring Algorithm

```typescript
function isSourceRelevantToClient(
  source: CollectedSource,
  clientName: string,
  clientWebsite: string
): { isRelevant: boolean; relevanceScore: number; reason: string } {
  const clientNameLower = clientName.toLowerCase().trim();
  const clientDomain = extractDomain(clientWebsite);
  
  let score = 0;
  let reasons: string[] = [];
  
  // PRIORITY 1: Exact domain match (60 points)
  const clientDomainBase = clientDomain.split('.')[0];
  const sourceDomainBase = extractDomain(source.url).split('.')[0];
  
  if (sourceDomainBase === clientDomainBase) {
    score += 60;
    reasons.push('exact_domain_match');
  } else if (sourceDomain.includes(clientDomainBase)) {
    score += 40;
    reasons.push('related_domain');
  }
  
  // PRIORITY 2: URL path contains client name slug (25 points)
  const clientNameSlug = clientNameLower.replace(/\s+/g, '-');
  if (source.url.includes(`/${clientNameSlug}`)) {
    score += 25;
    reasons.push('url_path_contains_name');
  }
  
  // PRIORITY 3: Title contains EXACT client name (30 points)
  const exactNamePattern = new RegExp(`\\b${clientNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (exactNamePattern.test(source.title.toLowerCase())) {
    score += 30;
    reasons.push('exact_name_in_title');
  }
  
  // PRIORITY 4: Snippet contains exact client name with company context (25 points)
  if (exactNamePattern.test(source.snippet?.toLowerCase() || '')) {
    if (isAboutCompanyContext(source.snippet, clientName)) {
      score += 25;
      reasons.push('name_in_snippet_with_company_context');
    } else {
      score += 10;
      reasons.push('name_in_snippet_no_context');
    }
  }
  
  // PRIORITY 5: Known business/tech news sources (15 points)
  const businessNewsDomains = ['techcrunch', 'forbes', 'bloomberg', 'reuters', 'wsj', 'businessinsider', 'venturebeat', 'crunchbase', 'linkedin', 'glassdoor', 'g2', 'capterra', 'trustradius'];
  const isBusinessNews = businessNewsDomains.some(d => sourceDomain.includes(d));
  
  if (isBusinessNews && exactNamePattern.test(source.title + ' ' + source.snippet)) {
    score += 15;
    reasons.push('business_news_mention');
  }
  
  // Normalize to 0-100, minimum threshold: 35
  const normalizedScore = Math.min(100, score);
  const isRelevant = normalizedScore >= 35;
  
  return { isRelevant, relevanceScore: normalizedScore, reason: reasons.join(', ') };
}
```

### Report Confidence Calculation

```typescript
function calculateReportConfidence(
  sourceStats: { total: number; valid: number; avgScore: number },
  ragDocsCount: number
): { score: number; level: 'high' | 'medium' | 'low'; explanation: string } {
  const validationRatio = sourceStats.total > 0 ? (sourceStats.valid / sourceStats.total) : 0;
  
  // Weighted score calculation
  let score = 0;
  score += validationRatio * 50;                          // Source validation: 50%
  score += (sourceStats.avgScore / 100) * 30;             // Average relevance: 30%
  score += Math.min(1, sourceStats.valid / 30) * 10;      // Sufficient sources: 10%
  score += Math.min(1, ragDocsCount / 10) * 10;           // RAG context: 10%
  
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
```

---

## RAG Integration

### External Vector Database Setup

The RAG system uses an external Supabase project with:
- **Embedding Model**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Vector Search Function**: `match_documents(filter, match_count, query_embedding)`

### RAG Queries by Report Type

```typescript
// Account Snapshot - Industry-specific queries
const ragQueries = [
  `Pendo ${useCaseCategories[0]} use cases and ROI metrics`,
  `Pendo ${useCaseCategories[1]} success stories`,
  `Pendo ${clientIndustry} customer value drivers and outcomes`,
  "Pendo competitive positioning vs WalkMe Amplitude Whatfix",
];

// Value Hypothesis - Whitespace intelligence
const ragQueries = [
  "product analytics customer engagement use cases testimonials",
  "digital adoption onboarding user retention case study",
  "in-app guidance feature adoption ROI success metrics",
  "Pendo whitespace competitive gap opportunity displacement",
  "Pendo versus WalkMe Whatfix Amplitude Mixpanel comparison",
];

// Strategy Map - Transformation focus
const ragQueries = [
  "digital transformation customer experience strategy Pendo",
  "product-led growth PLG self-service adoption conversion",
  "in-app guidance onboarding feature adoption ROI",
  "Pendo whitespace competitive gap opportunity displacement",
];
```

### RAG Document Search Function

```typescript
async function searchRAGDocuments(
  query: string,
  openaiApiKey: string,
  supabaseServiceClient: any,
  matchCount: number = 10
): Promise<{ id?: number; content: string; metadata: any; similarity: number }[]> {
  // Step 1: Generate embedding
  const embedding = await generateEmbedding(query, openaiApiKey);
  if (embedding.length === 0) return [];
  
  // Step 2: Vector search using match_documents RPC
  const { data, error } = await supabaseServiceClient.rpc("match_documents", {
    filter: {},
    match_count: matchCount,
    query_embedding: embedding,
  });
  
  if (error) {
    console.error("[RAG] match_documents RPC error:", JSON.stringify(error));
    return [];
  }
  
  return data || [];
}
```

---

## Database Schema

### `account_intelligence_reports` Table

```sql
CREATE TABLE public.account_intelligence_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_website TEXT NOT NULL,
  salesforce_id TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('overview', 'strategic', 'value', 'strategy', 'value_hypothesis', 'strategy_map', 'outreach', 'snapshot')),
  report_data JSONB NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_intelligence_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own reports" 
  ON public.account_intelligence_reports FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" 
  ON public.account_intelligence_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" 
  ON public.account_intelligence_reports FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" 
  ON public.account_intelligence_reports FOR DELETE USING (auth.uid() = user_id);
```

### `account_intelligence_usage` Table

```sql
CREATE TABLE public.account_intelligence_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID REFERENCES public.account_intelligence_reports(id),
  client_name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  openai_calls INTEGER DEFAULT 0,
  openai_input_tokens INTEGER DEFAULT 0,
  openai_output_tokens INTEGER DEFAULT 0,
  openai_cost_usd NUMERIC DEFAULT 0,
  gemini_calls INTEGER DEFAULT 0,
  gemini_input_tokens INTEGER DEFAULT 0,
  gemini_output_tokens INTEGER DEFAULT 0,
  gemini_cost_usd NUMERIC DEFAULT 0,
  google_search_calls INTEGER DEFAULT 0,
  google_search_results INTEGER DEFAULT 0,
  google_search_cost_usd NUMERIC DEFAULT 0,
  serper_calls INTEGER DEFAULT 0,
  serper_results INTEGER DEFAULT 0,
  serper_cost_usd NUMERIC DEFAULT 0,
  embedding_calls INTEGER DEFAULT 0,
  embedding_tokens INTEGER DEFAULT 0,
  embedding_cost_usd NUMERIC DEFAULT 0,
  total_cost_usd NUMERIC DEFAULT 0,
  generation_time_seconds NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

---

## Cost Estimates (2024-2025 Pricing)

```typescript
const COST_RATES = {
  openai: { 
    inputPer1M: 2.50,     // GPT-4o/5 input
    outputPer1M: 10.00    // GPT-4o/5 output
  },
  openaiTts: { 
    per1MChars: 30.00     // tts-1-hd
  },
  gemini: { 
    inputPer1M: 0.075,    // Gemini 2.5 Pro input
    outputPer1M: 0.30     // Gemini 2.5 Pro output
  },
  googleSearch: { 
    perCall: 0.005        // $5 per 1000 queries
  },
  serper: { 
    perCall: 0.001        // ~$1 per 1000 queries
  },
  embedding: { 
    per1M: 0.02           // text-embedding-3-small
  },
};

// Typical report costs:
// - Account Snapshot: ~$0.05-0.15
// - Account Overview: ~$0.30-0.50
// - Value Hypothesis: ~$0.20-0.35
// - Strategy Map: ~$0.15-0.25
```

---

## Edge Function Configuration

```toml
# supabase/config.toml

[functions.account-intelligence]
verify_jwt = false
max_body_size = 10485760
time_limit = 300

[functions.value-hypothesis]
verify_jwt = false
max_body_size = 10485760
time_limit = 300

[functions.strategy-map]
verify_jwt = false
max_body_size = 10485760
time_limit = 300

[functions.account-snapshot]
verify_jwt = false
max_body_size = 10485760
time_limit = 300
```

---

## Summary

This documentation provides everything needed to recreate the Account Intelligence system:

1. **Architecture**: Parallel chunked generation with alternating OpenAI/Gemini models
2. **Search**: Google Custom Search (primary) + Serper.dev (backup) with 35%+ relevance threshold
3. **RAG**: External vector DB for Pendo-specific case studies and whitespace intelligence
4. **Prompts**: Complete system prompts and JSON schemas for all 4 report types
5. **Validation**: Domain filtering and multi-factor relevance scoring
6. **Database**: Full schema with RLS policies and usage tracking
7. **Config**: Edge function timeouts and body limits for long-running research

For implementation, copy the edge functions and adapt the search queries/prompts for your specific use case.
