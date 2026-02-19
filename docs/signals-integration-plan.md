# Signals Integration — Feasibility Plan

## Context
The n8n workflow "Signals Project 6sense Email" collects sales signals from Clay (job postings, senior hires, fundraising, competitor hiring) and 6sense (hot accounts, contact engagement, web visits, intent activities) and stores them in a separate Supabase instance. The goal is to surface these signals in the pendogtm app so users see their account signals when they log in — both as a dedicated `/signals` page and as a tab on each account detail page.

---

## What Already Exists

### Signal Data (Supabase `itfpxlswzuybkdgaonxn`)
- **11 individual signal tables:** Clay AI Job Postings, Clay Competitor Job Postings, Clay Product Release Signals, Clay Product-Software Engineering Jobs, Clay Senior Product Hires, Clay Fundraising Signal, 6sense Hot Accounts, Sixth Sense Contact Engagement, Sixth Sense Recent Intent Activities, Sixth Sense Recent Web Visits, Qualified Signals Engagement
- **1 master table:** `"Master Table Updated 3"` — unified view of all signals
- **Common schema:** Account Name, Title, Account Domain, Account Owner, Account Owner Email, Account ID (SFDC), Account Type, Publish Date, Linkedin URL, Signal Type, Source, CRM Link, Meta Data (JSON), Week Ending Sunday
- **User identification:** signals tied to users via `Account Owner Email`

### App (Supabase `wwgnqczkfurgmjdqrrit`)
- Auth via `useAuth()` → `user.email`
- User email also in `profiles` table
- Existing list page pattern: toolbar + table + pagination (Accounts, Contacts)
- Existing detail page pattern: header + tabs (AccountDetail)

---

## Data Connection Options

### Option A: Second Supabase Client (fastest to implement)
- Add `VITE_SIGNALS_SUPABASE_URL` + `VITE_SIGNALS_SUPABASE_KEY` environment variables
- Create `src/integrations/supabase/signals-client.ts` with a second Supabase `createClient()`
- Query `"Master Table Updated 3"` directly from the frontend
- **Pros:** Fast to implement, no backend changes, queries existing data immediately
- **Cons:** Second API key exposed in frontend, depends on anon key having read access
- **Effort:** ~1 hour

### Option B: Edge Function Proxy (most secure)
- Create a Supabase edge function in the app's DB that connects to the signals DB server-side
- Frontend calls `supabase.functions.invoke('get-signals', { body: { email } })`
- Edge function uses a service key to query signals DB, returns filtered results
- **Pros:** Most secure (service key stays server-side), single frontend Supabase client
- **Cons:** Requires deploying an edge function, slight latency overhead
- **Effort:** ~2-3 hours

### Option C: Migrate to Single DB (cleanest long-term)
- Create a `signals` table in the app's Supabase with the same schema as the master table
- Update n8n workflow to write signals to the app's DB (in addition to or instead of current)
- Add Row Level Security: users can only read signals where `Account Owner Email` matches their auth email
- **Pros:** Single database, proper RLS, simplest frontend code, standard Supabase patterns
- **Cons:** Requires n8n workflow changes + initial data migration
- **Effort:** ~4-6 hours

**Recommendation:** Start with Option A or B for quick iteration, migrate to Option C long-term.

---

## UI Design: `/signals` Page

### Layout
```
┌──────────────────────────────────────────────┐
│ TopBar: "My Signals"                         │
├──────────────────────────────────────────────┤
│ SignalsToolbar                                │
│ [Search...] [Signal Type ▾] [Date Range ▾]  │
│ 47 signals                                   │
├──────────────────────────────────────────────┤
│ Signal feed (cards, sorted by date DESC)     │
│                                              │
│ 🔴 6sense Hot Account · Acme Corp            │
│    Jan 15, 2026                              │
│                                              │
│ 👤 Senior Hire · HiBob                       │
│    Jane Doe joined as VP Product             │
│    Jan 14, 2026                              │
│                                              │
│ 💼 Competitor Job Posting · Qualtrics        │
│    "Product Architect" referencing Pendo     │
│    Jan 13, 2026                              │
│                                              │
│ Page 1 of 3                     [<] [>]      │
└──────────────────────────────────────────────┘
```

### New Files Required
- `src/pages/Signals.tsx` — page component with toolbar, feed, and pagination
- `src/components/signals/SignalsToolbar.tsx` — search input + signal type dropdown + date range filter
- `src/components/signals/SignalCard.tsx` — individual signal card with type icon, account link, title, date, LinkedIn link
- `src/hooks/useSignals.ts` — React Query hook querying signals filtered by user email

### Existing Files to Edit
- `src/App.tsx` — add `/signals` route
- `src/components/layout/AppSidebar.tsx` — add "Signals" nav item in Workspace group
- `src/components/layout/TopBar.tsx` — add "Signals" route label

### Signal Type Visual Mapping
| Signal Type | Icon | Display Format |
|---|---|---|
| 6sense New Hot Account | Flame | "New Hot Account" badge |
| Sixth Sense Contact Engagement | UserCheck | Person name + title engaging with pages |
| Sixth Sense Recent Web Visits | Globe | Web visit activity summary |
| Sixth Sense Recent Intent Activities | Target | Intent keywords |
| Clay AI Job Postings | Briefcase | Job title + location |
| Job Postings - Growth Flag | TrendingUp | X% growth vs average |
| Competitor Job Postings | Swords | Job title + competitor name |
| Senior Hires / Hiring | UserPlus | Person name + title + start date |
| News / Fundraising / Product Release | Newspaper | News title + publisher link |
| Qualified Signals Engagement | Zap | Heating/trending status |

---

## UI Design: Account Detail Signals Tab

### Changes
- `src/pages/AccountDetail.tsx` — add 5th "Signals" tab with count badge (matching existing tab style)
- New: `src/components/accounts/tabs/AccountSignalsTab.tsx` — reuses `SignalCard`, filtered by Account ID
- `src/hooks/useAccountDetail.ts` — add signals query, or create separate `useAccountSignals(accountId)` hook

### Query Pattern
```sql
SELECT * FROM "Master Table Updated 3"
WHERE "Account ID" = '{sfdc_account_id}'
ORDER BY "Publish Date" DESC
```

---

## User Mapping

Signals identify ownership via `Account Owner Email`. The app identifies users via `useAuth() → user.email`.

**How it connects:**
1. User logs in → get `user.email` from Supabase auth
2. Query signals: `WHERE "Account Owner Email" = user.email`
3. Works because SFDC account owners are the same people logging into the app

**Edge case:** If a user's app login email differs from their SFDC Account Owner Email, a `salesforce_email` mapping field could be added to the `profiles` table. Not needed for initial implementation.

---

## Effort Summary

| Component | Complexity | New Files | File Edits |
|---|---|---|---|
| Data connection (Option A) | Low | 1 | env vars |
| `useSignals` hook | Low | 1 | — |
| Signals page + toolbar + cards | Medium | 3 | — |
| Account detail signals tab | Low | 1 | 2 |
| Routing + sidebar + topbar | Low | — | 3 |
| **Total** | **Medium** | **~6 new files** | **~5 edits** |

---

## Verdict

**Fully feasible.** The signal data already exists with a clean, consistent schema and per-user filtering built in. The UI follows the exact patterns already established in the app (list pages like Accounts/Contacts, detail tabs like AccountDetail). No major architectural changes are needed — it's essentially another list page plus another detail tab. The main architectural decision is the data connection strategy (Options A/B/C above).
