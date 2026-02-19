# Meeting Analysis Feature - Complete Technical Specification

## Overview

The **Meeting Analysis** feature provides AI-powered analysis of weekly meetings, extracting insights, action items, and sentiment from calendar data via the Momentum.io API. It includes a high-density calendar view, consolidated action items management, and role-based access control.

---

## Architecture

### Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase Edge Functions (Deno)
- **External API**: Momentum.io API for meeting data
- **Database**: Supabase PostgreSQL with RLS

### Key Files
```
src/pages/MeetingAnalysis.tsx              # Main page component
src/components/meeting-analysis/
  ├── ActionItemsView.tsx                  # Action items grid/table with filters
  ├── MeetingDetailDialog.tsx              # Meeting detail modal with AI insights
supabase/functions/
  ├── momentum-data/index.ts               # Fetches & analyzes meetings
  └── analyze-meetings/index.ts            # AI analysis logic
```

---

## Database Schema

### Tables Used

```sql
-- User profiles (for name matching in "My Tasks" filter)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL, -- 'user' | 'editor' | 'super_admin'
  UNIQUE (user_id, role)
);

-- Rate limiting audit log
CREATE TABLE public.api_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_name TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  request_params JSONB,
  response_status INTEGER,
  ip_address TEXT,
  user_agent TEXT
);
```

### Database Functions

```sql
-- Rate limit checker
CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  _user_id UUID, 
  _api_name TEXT, 
  _max_calls INTEGER DEFAULT 20, 
  _window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  call_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO call_count
  FROM public.api_audit_log
  WHERE user_id = _user_id
    AND api_name = _api_name
    AND created_at > (now() - (_window_minutes || ' minutes')::INTERVAL);
  
  RETURN call_count < _max_calls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Role checker
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## Edge Function: momentum-data

### Purpose
Fetches meeting data from Momentum.io API and performs AI analysis.

### Endpoint
`POST /functions/v1/momentum-data`

### Request Body
```typescript
interface RequestBody {
  userEmail: string;      // Email to fetch meetings for
  startDate: string;      // ISO date string (week start)
  endDate: string;        // ISO date string (week end)
}
```

### Response
```typescript
interface WeekAnalysis {
  meetings: AnalyzedMeeting[];
  weekSummary: string;
  totalActionItems: number;
  actionItemsByPriority: {
    high: ActionItem[];
    medium: ActionItem[];
    low: ActionItem[];
  };
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
  actionItems: ActionItem[];
  keyTopics: string[];
  sentiment: "positive" | "neutral" | "negative";
  salesforceAccountId?: string;
}

interface ActionItem {
  task: string;
  owner: string;
  priority: "high" | "medium" | "low";
  dueDate?: string;
  meetingTitle?: string;
  meetingDate?: string;
  externalAttendees?: string[];
  needsFollowUp?: boolean;
}
```

### Key Implementation Details

```typescript
// Rate limiting configuration
const RATE_LIMIT_MAX_CALLS = 100;  // Calls per window (100 for dev, 20 for prod)
const RATE_LIMIT_WINDOW_MINUTES = 60;

// Check rate limit before processing
const { data: isAllowed } = await supabaseAdmin.rpc('check_api_rate_limit', {
  _user_id: userId,
  _api_name: 'momentum-data',
  _max_calls: RATE_LIMIT_MAX_CALLS,
  _window_minutes: RATE_LIMIT_WINDOW_MINUTES
});

if (!isAllowed) {
  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded', 
      message: `Maximum ${RATE_LIMIT_MAX_CALLS} calls per ${RATE_LIMIT_WINDOW_MINUTES} minutes` 
    }),
    { status: 429, headers: corsHeaders }
  );
}

// Log the API call
await supabaseAdmin.from('api_audit_log').insert({
  user_id: userId,
  api_name: 'momentum-data',
  action: 'fetch_meetings',
  request_params: { userEmail, startDate, endDate }
});
```

### Secrets Required
- `MOMENTUM_API_KEY` - Momentum.io API key
- `OPENAI_API_KEY` or `GEMINI_API_KEY` - For AI analysis
- `SUPABASE_SERVICE_ROLE_KEY` - For database operations

---

## Frontend Components

### 1. MeetingAnalysis.tsx (Main Page)

#### State Management
```typescript
const [isSuperAdmin, setIsSuperAdmin] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [currentWeekStart, setCurrentWeekStart] = useState(() => 
  startOfWeek(new Date(), { weekStartsOn: 1 })
);
const [selectedEmail, setSelectedEmail] = useState<string>("");
const [userName, setUserName] = useState<string>("");
const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
const [analysis, setAnalysis] = useState<WeekAnalysis | null>(null);
const [viewMode, setViewMode] = useState<"calendar" | "actions">("calendar");
const [rateLimitError, setRateLimitError] = useState<string | null>(null);
```

#### Access Control Logic
```typescript
// On component mount
useEffect(() => {
  const initialize = async () => {
    // Get user's profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    // Check super admin status
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    const isAdmin = !!roleData;
    setIsSuperAdmin(isAdmin);
    setSelectedEmail(user.email || "");

    // Super admins can view any team member's meetings
    if (isAdmin) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .not("email", "is", null)
        .order("full_name");

      if (profiles) {
        setTeamMembers(profiles.filter(p => p.email) as TeamMember[]);
      }
    }
  };
  initialize();
}, [user]);
```

#### Rate Limit Error Handling
```typescript
// Handle FunctionsHttpError for 429 responses
catch (error) {
  if (error instanceof FunctionsHttpError) {
    try {
      const errorBody = await error.context.json();
      if (error.context.status === 429) {
        setRateLimitError(errorBody.message || 'Rate limit exceeded');
        return;
      }
    } catch {}
  }
  toast.error("Failed to analyze meetings");
}
```

### 2. ActionItemsView.tsx (Action Items Component)

#### Props Interface
```typescript
interface ActionItemsViewProps {
  actionItemsByPriority: ActionItemsByPriority;
  totalActionItems: number;
  userEmail?: string;
  userName?: string;
  isSuperAdmin?: boolean;
}
```

#### Filter State
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [selectedPriorities, setSelectedPriorities] = useState<string[]>(["high", "medium", "low"]);
const [selectedOwner, setSelectedOwner] = useState<string>("all");
const [selectedMeeting, setSelectedMeeting] = useState<string>("all");
const [selectedClient, setSelectedClient] = useState<string>("all");
const [followUpFilter, setFollowUpFilter] = useState<string>("all");
const [myTasksOnly, setMyTasksOnly] = useState(false);
const [sortField, setSortField] = useState<SortField>("priority");
const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
const [viewMode, setViewMode] = useState<ViewMode>("cards");
```

#### Client Name Extraction Logic
```typescript
const extractClientName = (item: ActionItem): string => {
  // Priority 1: External attendee email domains
  if (item.externalAttendees && item.externalAttendees.length > 0) {
    for (const attendee of item.externalAttendees) {
      if (attendee.includes('@')) {
        const domain = attendee.split('@')[1]?.split('.')[0]?.toLowerCase();
        // Skip internal domain and common email providers
        if (domain && domain.length > 2 && 
            domain !== 'pendo' && 
            !['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud'].includes(domain)) {
          return domain.charAt(0).toUpperCase() + domain.slice(1);
        }
      }
    }
  }
  
  // Priority 2: Meeting title patterns (e.g., "Company | Meeting")
  if (item.meetingTitle) {
    const titleMatch = item.meetingTitle.match(/^([^|/\\-]+?)(?:\s*[|/\\-])/);
    if (titleMatch && titleMatch[1].trim().length > 2) {
      const extracted = titleMatch[1].trim().toLowerCase();
      if (!extracted.includes('pendo')) {
        return titleMatch[1].trim();
      }
    }
  }
  
  return "";
};
```

#### "My Tasks" User Matching Logic
```typescript
const matchesCurrentUser = (ownerName: string): boolean => {
  if (!userEmail && !userName) return false;
  
  const ownerLower = ownerName.toLowerCase();
  
  // Match by email prefix
  if (userEmail) {
    const emailPrefix = userEmail.split('@')[0].toLowerCase().replace(/[._]/g, ' ');
    if (ownerLower.includes(emailPrefix) || emailPrefix.includes(ownerLower.split(' ')[0])) {
      return true;
    }
  }
  
  // Match by name
  if (userName) {
    const nameLower = userName.toLowerCase();
    const nameParts = nameLower.split(' ');
    const ownerParts = ownerLower.split(' ');
    
    if (nameLower === ownerLower) return true;
    if (nameParts.length > 0 && ownerParts.length > 0) {
      if (nameParts[0] === ownerParts[0]) return true;
      if (nameParts.some(p => ownerParts.includes(p))) return true;
    }
  }
  
  return false;
};
```

#### Follow-up Detection Logic
```typescript
const determineNeedsFollowUp = (item: ActionItem): boolean => {
  if (item.needsFollowUp !== undefined) return item.needsFollowUp;
  
  // High priority items always need follow-up
  if (item.priority === "high") return true;
  
  // Check for follow-up keywords in task
  const followUpKeywords = [
    'follow up', 'follow-up', 'followup', 'schedule', 'send', 
    'reach out', 'contact', 'call', 'email', 'meeting', 'demo', 'proposal'
  ];
  const taskLower = item.task.toLowerCase();
  return followUpKeywords.some(keyword => taskLower.includes(keyword));
};
```

---

## UI Features

### 1. Calendar View
- Weekly calendar grid (Monday-Sunday)
- Meeting cards with:
  - Title
  - Time & duration
  - Attendee count
  - Sentiment indicator (🟢 positive, 🟡 neutral, 🔴 negative)
  - External meeting badge
- Click to open detail dialog

### 2. Action Items View
- **View Modes**: Cards (grid) or Table
- **Filters**:
  - Search (task, owner, meeting, client)
  - Priority (High/Medium/Low checkboxes)
  - Owner dropdown (Super Admin only)
  - Meeting dropdown
  - Client dropdown (extracted from attendee domains)
  - Follow-up filter (Yes/No/All)
  - "My Tasks" toggle button
- **Sorting**: Priority, Owner, Due Date, Meeting, Client (Asc/Desc)
- **Summary badges**: Count of High/Medium/Low items

### 3. Meeting Detail Dialog
- AI-generated summary
- Key topics as badges
- Sentiment analysis
- Follow-up urgency indicator
- Meeting type classification (Customer vs Internal)
- Prioritized action items list
- Participant list with external highlighting

---

## Access Control Matrix

| Feature | Regular User | Super Admin |
|---------|--------------|-------------|
| View own meetings | ✅ | ✅ |
| View team meetings | ❌ | ✅ |
| User email selector | ❌ | ✅ |
| Owner filter dropdown | ❌ | ✅ |
| "My Tasks" button | ✅ | ✅ |
| Client filter | ✅ | ✅ |
| All other filters | ✅ | ✅ |

---

## Rate Limiting

- **Default**: 20 calls per 60 minutes per user
- **Development**: 100 calls per 60 minutes
- **Error Response**: 429 with friendly UI message
- **Storage**: `api_audit_log` table
- **Check**: `check_api_rate_limit` database function

---

## Error Handling

### Rate Limit (429)
```typescript
// Edge function returns
{ status: 429, body: { error: "Rate limit exceeded", message: "Maximum X calls per Y minutes" } }

// Frontend displays warning card instead of blank screen
{rateLimitError && (
  <Card className="border-amber-500/50 bg-amber-500/10">
    <CardContent>
      <AlertCircle className="h-8 w-8 text-amber-500" />
      <p>{rateLimitError}</p>
    </CardContent>
  </Card>
)}
```

### API Errors
- Toast notifications for transient errors
- Inline error states for persistent issues
- Graceful degradation with empty states

---

## Styling Notes

### Sticky Filter Bar
```tsx
<div className="sticky top-0 z-50 bg-background border border-border rounded-xl p-4 shadow-lg">
```

### Dropdown Z-Index Fix
```tsx
<DropdownMenuContent className="bg-popover border-border z-50">
<SelectContent className="bg-popover border-border z-50">
```

### Priority Color System
```typescript
const priorityColors = {
  high: {
    bg: "bg-gradient-to-br from-rose-500/20 to-red-500/10",
    border: "border-rose-500/30 hover:border-rose-500/50",
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/40"
  },
  medium: {
    bg: "bg-gradient-to-br from-amber-500/20 to-orange-500/10",
    border: "border-amber-500/30 hover:border-amber-500/50",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40"
  },
  low: {
    bg: "bg-gradient-to-br from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/30 hover:border-emerald-500/50",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
  }
};
```

---

## Dependencies

```json
{
  "date-fns": "^3.6.0",       // Date manipulation
  "lucide-react": "^0.462.0", // Icons
  "@supabase/supabase-js": "^2.75.1",
  "@tanstack/react-query": "^5.83.0"
}
```

### shadcn/ui Components Used
- Card, CardContent
- Badge
- Button
- Input
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem
- Dialog, DialogContent, DialogHeader, DialogTitle
- Table, TableBody, TableCell, TableHead, TableHeader, TableRow
- ToggleGroup, ToggleGroupItem
- Tabs, TabsList, TabsTrigger
- Skeleton

---

## Setup Checklist for New Project

1. **Database**
   - [ ] Create `profiles` table with `full_name`, `email`
   - [ ] Create `user_roles` table with `super_admin` role
   - [ ] Create `api_audit_log` table
   - [ ] Create `check_api_rate_limit` function
   - [ ] Create `has_role` function
   - [ ] Set up RLS policies

2. **Secrets**
   - [ ] Add `MOMENTUM_API_KEY`
   - [ ] Add `OPENAI_API_KEY` or use Lovable AI
   - [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is available

3. **Edge Functions**
   - [ ] Create `momentum-data` function with rate limiting
   - [ ] Create `analyze-meetings` function for AI processing

4. **Frontend**
   - [ ] Install dependencies (date-fns, lucide-react)
   - [ ] Add shadcn/ui components
   - [ ] Create `MeetingAnalysis.tsx` page
   - [ ] Create `ActionItemsView.tsx` component
   - [ ] Create `MeetingDetailDialog.tsx` component
   - [ ] Add route to App.tsx

5. **Authentication**
   - [ ] Ensure user authentication is set up
   - [ ] Populate `profiles` table on user signup
   - [ ] Assign roles via `user_roles` table

---

## Future Enhancements (Ideas)

- [ ] Export to CSV/PDF
- [ ] Integration with CRM (Salesforce)
- [ ] Slack notifications for high-priority items
- [ ] Calendar sync for due dates
- [ ] Recurring meeting pattern analysis
- [ ] Team-wide analytics dashboard
