

## Add Meeting Analysis, Account Insights & Management Brief to Analytics Dashboard

### Current State
The analytics dashboard at `/insights` only shows usage data from Account Intelligence reports (snapshot, research, strategic, etc.) via the `account_intelligence_usage` table. Three other edge functions -- `analyze-meetings`, `account-insights` (meeting insights with Salesforce ID), and `management-brief` -- do not log their usage, so they are invisible in the dashboard.

### What Will Change

#### 1. Add Usage Tracking to Edge Functions

Each of these three edge functions will be updated to insert a record into the `account_intelligence_usage` table after completing their work:

- **`analyze-meetings`** -- will log with `report_type: "meeting_analysis"`, tracking OpenAI/Gemini calls and tokens used during meeting analysis
- **`account-insights`** -- will log with `report_type: "account_insights"`, tracking Lovable AI calls used for executive analysis, stakeholder analysis, and individual meeting analysis
- **`management-brief`** -- will log with `report_type: "management_brief"`, tracking Lovable AI calls used for the comprehensive brief generation

Each insert will include:
- `user_id` (from auth)
- `client_name` (account name or "Weekly Analysis")
- `report_type` (the specific type above)
- `generation_time_seconds` (measured via `Date.now()` at start/end)
- API call counts and token estimates where available

#### 2. No Dashboard Code Changes Needed

The existing `AccountIntelligenceAnalytics` component already dynamically handles all report types -- it groups by `report_type` and displays them in the "Report Types" breakdown. Once the edge functions start writing records, the new report types will automatically appear in:
- The "Reports Generated" count
- The "Total API Cost" total
- The "Report Types" breakdown card
- The "Top Researched Accounts" list
- The daily usage trend chart

### Technical Details

**Edge function changes pattern** (same for all three):

```text
// At the start of the function handler:
const startTime = Date.now();

// After successful response generation, before returning:
const generationTime = Math.round((Date.now() - startTime) / 1000);

await supabaseAdmin.from("account_intelligence_usage").insert({
  user_id: user.id,
  client_name: accountName || "Weekly Analysis",
  report_type: "meeting_analysis",  // or "account_insights" / "management_brief"
  openai_calls: openaiCallCount,
  openai_input_tokens: estimatedInputTokens,
  openai_output_tokens: estimatedOutputTokens,
  gemini_calls: geminiCallCount,
  // ... other fields default to 0
  total_cost_usd: estimatedCost,
  generation_time_seconds: generationTime,
});
```

- The `analyze-meetings` function uses direct OpenAI/Gemini API keys, so we can estimate token counts from the responses
- The `account-insights` and `management-brief` functions use the Lovable AI gateway, so we will track call counts and estimate tokens based on prompt length
- All inserts use the service role client (`supabaseAdmin`) to bypass RLS, matching the existing pattern in `account-intelligence`
- Failures will not block the main response -- usage logging is wrapped in try/catch

### Files Modified
1. `supabase/functions/analyze-meetings/index.ts` -- add usage tracking
2. `supabase/functions/account-insights/index.ts` -- add usage tracking
3. `supabase/functions/management-brief/index.ts` -- add usage tracking

No frontend changes required.
