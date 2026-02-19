# GTM Hub Dashboard - Complete UI Documentation

> **Version**: 2.0 (Comprehensive)  
> **Last Updated**: January 14, 2026  
> **Application Name**: GTM Hub (formerly AI GTM Hub)  
> **Published URL**: https://pendo-ai-ignite.lovable.app

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Design System](#3-design-system)
4. [Layout Architecture](#4-layout-architecture)
5. [Routing & Navigation](#5-routing--navigation)
6. [Authentication System](#6-authentication-system)
7. [Pages - Complete Documentation](#7-pages---complete-documentation)
8. [Components - Complete Documentation](#8-components---complete-documentation)
9. [UI Components (shadcn/ui)](#9-ui-components-shadcnui)
10. [Hooks](#10-hooks)
11. [Utilities & Libraries](#11-utilities--libraries)
12. [Data & Types](#12-data--types)
13. [Edge Functions (Backend)](#13-edge-functions-backend)
14. [Database Schema](#14-database-schema)
15. [Animations & Effects](#15-animations--effects)
16. [Icons](#16-icons)
17. [Assets](#17-assets)
18. [State Management](#18-state-management)
19. [Error Handling](#19-error-handling)
20. [Accessibility](#20-accessibility)
21. [Responsive Design](#21-responsive-design)

---

## 1. Overview

GTM Hub is an AI-powered workflow automation platform designed for Go-To-Market teams at Pendo. It provides:

- **AI Workflows**: Pre-built automation workflows for GTM tasks (account research, value hypothesis, transcript analysis, etc.)
- **Ask Will**: AI assistant for strategic questions (Quick Q&A and Deep Analysis modes)
- **Ask Ace**: AI assistant for additional support
- **Ask RFP**: AI assistant for RFP-related questions
- **Customer Journey View**: Workflows organized by customer engagement stages
- **Analytics Dashboard**: Admin insights and metrics (Super Admin only)
- **User Management**: Role-based access control
- **Workflow Management**: Create, edit, delete workflows (Super Admin only)

### Key Features
- Google OAuth authentication with @pendo.io domain restriction
- Dark/Light theme support
- Real-time workflow execution via webhooks
- Slack integration for help requests
- CSV export for analytics
- Matrix Rain visual effect

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| TypeScript | - | Type Safety |
| Vite | - | Build Tool |
| Tailwind CSS | - | Styling |
| shadcn/ui | - | Component Library |
| React Router DOM | 6.30.1 | Routing |
| TanStack Query | 5.83.0 | Server State Management |
| Recharts | 2.15.4 | Charts & Data Visualization |
| Lucide React | 0.462.0 | Icons |
| next-themes | 0.3.0 | Theme Management |
| react-markdown | 10.1.0 | Markdown Rendering |
| Zod | 3.25.76 | Schema Validation |
| date-fns | 3.6.0 | Date Utilities |
| sonner | 1.7.4 | Toast Notifications |
| vaul | 0.9.9 | Drawer Component |
| class-variance-authority | 0.7.1 | Variant Management |
| clsx | 2.1.1 | Class Utilities |
| tailwind-merge | 2.6.0 | Tailwind Class Merging |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | Database, Auth, Edge Functions |
| Deno | Edge Function Runtime |
| PostgreSQL | Database |

---

## 3. Design System

### 3.1 Color Palette

**File**: `src/index.css`

All colors use HSL format for consistency.

#### Light Mode (`:root`)
```css
--background: 0 0% 98%;           /* #FAFAFA - Near white */
--foreground: 0 0% 20%;           /* #333333 - Dark gray */
--card: 0 0% 100%;                /* #FFFFFF - Pure white */
--card-foreground: 0 0% 20%;      /* #333333 - Dark gray */
--popover: 0 0% 100%;             /* #FFFFFF - White */
--popover-foreground: 0 0% 20%;   /* #333333 */
--primary: 345 100% 64%;          /* #FF4876 - Pendo Pink */
--primary-foreground: 0 0% 100%;  /* #FFFFFF - White */
--secondary: 0 0% 96%;            /* #F5F5F5 - Light gray */
--secondary-foreground: 0 0% 20%; /* #333333 */
--muted: 0 0% 96%;                /* #F5F5F5 */
--muted-foreground: 0 0% 45%;     /* #737373 - Medium gray */
--accent: 0 0% 85%;               /* #D9D9D9 - Hover gray */
--accent-foreground: 0 0% 20%;    /* #333333 */
--destructive: 0 84.2% 60.2%;     /* #EF4444 - Red */
--destructive-foreground: 0 0% 100%;
--border: 0 0% 90%;               /* #E5E5E5 */
--input: 0 0% 90%;                /* #E5E5E5 */
--ring: 345 100% 64%;             /* Pendo Pink */
--radius: 0.75rem;                /* 12px */
```

#### Dark Mode (`.dark`)
```css
--background: 0 0% 0%;            /* #000000 - Pure black */
--foreground: 0 0% 95%;           /* #F2F2F2 - Near white */
--card: 0 0% 8%;                  /* #141414 - Very dark gray */
--card-foreground: 0 0% 95%;      /* #F2F2F2 */
--popover: 0 0% 8%;               /* #141414 */
--popover-foreground: 0 0% 95%;   /* #F2F2F2 */
--primary: 345 100% 64%;          /* #FF4876 - Pendo Pink (unchanged) */
--primary-foreground: 0 0% 100%;  /* #FFFFFF */
--secondary: 0 0% 15%;            /* #262626 */
--secondary-foreground: 0 0% 95%; /* #F2F2F2 */
--muted: 0 0% 15%;                /* #262626 */
--muted-foreground: 0 0% 65%;     /* #A6A6A6 */
--accent: 0 0% 25%;               /* #404040 */
--accent-foreground: 0 0% 95%;    /* #F2F2F2 */
--destructive: 0 62.8% 30.6%;     /* Darker red */
--destructive-foreground: 0 0% 95%;
--border: 0 0% 20%;               /* #333333 */
--input: 0 0% 20%;                /* #333333 */
--ring: 345 100% 64%;             /* Pendo Pink */
```

#### Brand Colors (Pendo)
```css
--pendo-dark: 0 0% 20%;           /* #333333 */
--pendo-pink: 345 100% 64%;       /* #FF4876 - Signature pink */
--pendo-yellow: 55 98% 76%;       /* #FFF176 */
--pendo-light: 0 0% 98%;          /* #FAFAFA */
```

#### Sidebar Theme Variables
```css
--sidebar-background: 0 0% 98%;
--sidebar-foreground: 240 5.3% 26.1%;
--sidebar-primary: 240 5.9% 10%;
--sidebar-primary-foreground: 0 0% 98%;
--sidebar-accent: 240 4.8% 95.9%;
--sidebar-accent-foreground: 240 5.9% 10%;
--sidebar-border: 220 13% 91%;
--sidebar-ring: 217.2 91.2% 59.8%;
```

### 3.2 Typography

**File**: `tailwind.config.ts`

```typescript
fontFamily: {
  'sans': ['Inter', 'system-ui', 'sans-serif'],
}
```

| Scale | Size | Usage |
|-------|------|-------|
| text-xs | 12px | Badges, captions |
| text-sm | 14px | Body text, descriptions |
| text-base | 16px | Default body |
| text-lg | 18px | Subheadings |
| text-xl | 20px | Section titles |
| text-2xl | 24px | Card titles |
| text-3xl | 30px | Page headings |
| text-4xl | 36px | Hero titles |
| text-5xl | 48px | Large hero |
| text-6xl | 60px | Extra large hero |

### 3.3 Border Radius

```css
--radius: 0.75rem;  /* 12px base */
```

| Token | Value | CSS Class |
|-------|-------|-----------|
| lg | 12px | `rounded-lg` |
| md | 10px | `rounded-md` |
| sm | 8px | `rounded-sm` |
| full | 9999px | `rounded-full` |

### 3.4 Shadows

- `shadow-sm` - Small shadow for cards
- `shadow-md` - Medium shadow for buttons
- `shadow-lg` - Large shadow for dropdowns
- `shadow-xl` - Extra large for hover effects
- `shadow-2xl` - For floating elements

### 3.5 Tailwind Custom Colors

**File**: `tailwind.config.ts`

```typescript
colors: {
  'pendo-pink': 'hsl(345 100% 64%)',
  'pendo-yellow': 'hsl(55 98% 76%)',
  'pendo-dark': 'hsl(0 0% 20%)',
  'pendo-light': 'hsl(0 0% 98%)',
  // ... semantic colors from CSS variables
}
```

---

## 4. Layout Architecture

### 4.1 App Structure

**File**: `src/App.tsx`

```
QueryClientProvider
└── ThemeWrapper (next-themes)
    └── TooltipProvider
        ├── Toaster (shadcn/ui toast)
        ├── Sonner (sonner toast)
        └── BrowserRouter
            └── Routes
                ├── /auth (public) → Auth
                ├── /public/workflow (public) → PublicWorkflow
                └── ProtectedRoute → AppLayout
                    ├── Header (sticky)
                    └── Outlet (page content)
                        ├── / → Home
                        ├── /workflows → Index
                        ├── /workflows/create → CreateWorkflow
                        ├── /workflows/manage → ManageWorkflows
                        ├── /customer-engagement → CustomerEngagement
                        ├── /ask-will → AskWill
                        ├── /ask-will-reasoning → AskWillReasoning
                        ├── /ask-ace → AskAce
                        ├── /ask-rfp → AskRFP
                        ├── /users → Users
                        ├── /insights → Insights
                        └── /logs → Logs
```

### 4.2 AppLayout Component

**File**: `src/components/AppLayout.tsx`

```tsx
<div className="min-h-screen bg-background grid grid-rows-[auto_1fr]">
  <Header />
  <div className="min-h-0 flex flex-col">
    <Outlet />
  </div>
</div>
```

**Layout Properties**:
- CSS Grid: `grid-rows-[auto_1fr]`
- Header takes auto height
- Content fills remaining space
- `min-h-0` prevents flex overflow issues
- Background: `bg-background` (theme-aware)

---

## 5. Routing & Navigation

### 5.1 Route Configuration

**File**: `src/App.tsx`

| Path | Component | Access Level | Description |
|------|-----------|--------------|-------------|
| `/auth` | Auth | Public | Google OAuth login |
| `/public/workflow` | PublicWorkflow | Public | Public workflow form |
| `/` | Home | Protected | Landing/dashboard |
| `/workflows` | Index | Protected | Workflow browser |
| `/workflows/create` | CreateWorkflow | Super Admin | Create new workflow |
| `/workflows/manage` | ManageWorkflows | Super Admin | Edit/delete workflows |
| `/customer-engagement` | CustomerEngagement | Protected | Journey view |
| `/ask-will` | AskWill | Protected | AI Q&A (Quick) |
| `/ask-will-reasoning` | AskWillReasoning | Protected | AI Q&A (Deep) |
| `/ask-ace` | AskAce | Protected | Ace assistant |
| `/ask-rfp` | AskRFP | Protected | RFP assistant |
| `/users` | Users | Super Admin | User management |
| `/insights` | Insights | Super Admin | Analytics dashboard |
| `/logs` | Logs | Super Admin | Workflow logs |
| `/*` | NotFound | Public | 404 page |

### 5.2 Navigation Links (Header)

1. **Demo Hub** - External link to `https://demohub.pendoexperience.io/`
2. **Home** - `/`
3. **Workflows** - `/workflows`
4. **Journey** - `/customer-engagement`
5. **Ask Will** (Dropdown)
   - Quick Q&A - `/ask-will`
   - Deep Analysis - `/ask-will-reasoning`
6. **Super Admin** (Dropdown, if authorized)
   - Create Workflow - `/workflows/create`
   - Manage Workflows - `/workflows/manage`
   - Users - `/users`
   - Insights - `/insights`
   - Logs - `/logs`

---

## 6. Authentication System

### 6.1 Auth Hook

**File**: `src/hooks/useAuth.ts`

```typescript
export const useAuth = () => {
  return {
    user: User | null,           // Current user object
    session: Session | null,      // Supabase session
    loading: boolean,             // Auth state loading
    signOut: () => Promise<void>, // Sign out function
    isValidDomain: (email: string) => boolean, // Domain check
    isAuthenticated: boolean,     // Combined auth check
  };
};
```

**Features**:
- Listens to `onAuthStateChange` events
- Updates `last_login` in profiles table on sign-in
- Domain validation: `@pendo.io` only
- Session persistence via Supabase

### 6.2 Domain Restriction

```typescript
const ALLOWED_DOMAIN = "pendo.io";

const isValidDomain = (email: string | undefined): boolean => {
  return email?.endsWith(`@${ALLOWED_DOMAIN}`) ?? false;
};
```

### 6.3 Protected Route Component

**File**: `src/components/ProtectedRoute.tsx`

```tsx
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
```

### 6.4 Role System

```typescript
type AppRole = 'user' | 'editor' | 'super_admin';
```

**Role Checks**:
- Stored in `user_roles` table
- Cached in memory Map to prevent flicker
- Super Admin check uses `supabase.from('user_roles').select(...)`

---

## 7. Pages - Complete Documentation

### 7.1 Auth Page (`/auth`)

**File**: `src/pages/Auth.tsx`

#### Visual Structure
```
<div className="min-h-screen relative overflow-hidden">
  <MatrixRain />                    <!-- Background effect -->
  <div className="gradient-overlay" /> <!-- from-background/95 via-background/80 to-background/95 -->
  <Card className="w-full max-w-md">
    <CardHeader>
      <img src={pendoLogo} />       <!-- 64x64 -->
      <CardTitle>GTM Hub</CardTitle>
      <CardDescription>...</CardDescription>
    </CardHeader>
    <CardContent>
      <Button>Continue with Google</Button>
      <p>@pendo.io accounts only</p>
      <Badge><Shield /> Secure Login</Badge>
    </CardContent>
  </Card>
</div>
```

#### State Variables
- `isLoading: boolean` - Auth check loading state
- `isSigningIn: boolean` - Google sign-in in progress

#### Authentication Flow
1. Check for existing session on mount
2. If valid session exists → redirect to `/`
3. On "Continue with Google" click → `supabase.auth.signInWithOAuth`
4. Google OAuth with `hd: 'pendo.io'` hint
5. On callback → validate email domain
6. If invalid domain → sign out + show error toast
7. If valid → redirect to `/`

---

### 7.2 Home Page (`/`)

**File**: `src/pages/Home.tsx` (505 lines)

#### Sections

**1. Hero Section**
```tsx
<section className="w-full text-center space-y-8 py-40 relative overflow-hidden min-h-[600px]">
  <MatrixRain />
  <p>Welcome back, {firstName}! 👋</p>
  <h1>Your <span className="gradient-text">AI Workflow Hub</span></h1>
  <p>Description...</p>
  <div className="flex gap-4">
    <Button>Explore Workflows</Button>
    <Button variant="outline">Ask Will</Button>
  </div>
</section>
```

**2. Social Proof Stats**
```tsx
<section className="py-12 space-y-8">
  <h2>Real Impact, Real Results</h2>
  <div className="grid md:grid-cols-3 gap-8">
    <Card>Workflows Run: {animatedRuns}</Card>
    <Card>Hours Saved: {animatedHours}</Card>
    <Card>Efficiency Boost: 87%</Card>
  </div>
</section>
```

**3. Integration Logos**
- Google Drive, Slides, Docs, Sheets, Gmail
- Slack, Zapier, N8N
- OpenAI, Gemini, Salesforce
- Floating animation with staggered delays

**4. Features Section**
- 2-column grid
- AI Workflows card with 3 feature bullets
- Ask Will card with 3 feature bullets

**5. FAQ Section**
- 7 Accordion items
- Topics: What are AI Workflows, How to run, Workflow vs Ask Will, Completion time, Customization, Delivery, Security

**6. CTA Section**
- Centered layout
- "Ready to Accelerate Your GTM?"
- Two buttons

**7. Footer**
- 2-column grid
- "Have Questions?" → Opens QuestionDialog (help)
- "Got an Idea?" → Opens QuestionDialog (idea)

**8. StrategyHero (RevBot)**
- Floating assistant avatar
- Auto-expands after 10-15 seconds

#### State Variables
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [isQuestionOpen, setIsQuestionOpen] = useState(false);
const [isIdeaOpen, setIsIdeaOpen] = useState(false);
const [workflowStats, setWorkflowStats] = useState({ runs: 152, hoursSaved: 304 });
const [formData, setFormData] = useState({
  workflowName: "", description: "", targetRole: "", problemSolved: "", contactEmail: ""
});
```

---

### 7.3 Workflows Page (`/workflows`)

**File**: `src/pages/Index.tsx` (433 lines)

#### Layout Structure
```tsx
<div className="flex-1 bg-background">
  <main className="max-w-7xl mx-auto px-6 py-8 pb-24">
    <!-- Header Section -->
    <div className="mb-8 text-center">
      <h2>AI-Powered GTM Workflows</h2>
      <p>Description...</p>
    </div>
    
    <!-- Search -->
    <div className="mb-6 max-w-2xl mx-auto">
      <Input placeholder="Search workflows..." />
      <Button><RefreshCw /></Button>
      <p>Showing {count} workflows</p>
    </div>
    
    <!-- Tabs -->
    <Tabs>
      <TabsList className="grid grid-cols-2 lg:grid-cols-3">
        <TabsTrigger value="all">All ({count})</TabsTrigger>
        {categories.map(...)}
      </TabsList>
      <TabsContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map(workflow => <WorkflowCard />)}
        </div>
      </TabsContent>
    </Tabs>
  </main>
  
  <!-- Floating Action Bar -->
  <div className="fixed bottom-4 left-0 right-0 flex justify-center animate-float">
    <div className="bg-card border rounded-full px-4 py-2 flex gap-2">
      <Button>Need Help?</Button>
      <Button>Got Idea</Button>
    </div>
  </div>
  
  <!-- Modals -->
  <WorkflowDrawer />
  <WorkflowForm />
  <HelpModal />
  <WorkflowCreator />
  <QuestionDialog />
  <StrategyHero />
</div>
```

#### State Variables
```typescript
const [workflows, setWorkflows] = useState<Workflow[]>([]);
const [loading, setLoading] = useState(true);
const [activeTab, setActiveTab] = useState<string>("all");
const [searchQuery, setSearchQuery] = useState("");
const [selectedRole, setSelectedRole] = useState<string>("all");
const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const [isFormOpen, setIsFormOpen] = useState(false);
const [isHelpOpen, setIsHelpOpen] = useState(false);
const [isCreatorOpen, setIsCreatorOpen] = useState(false);
const [isLoading, setIsLoading] = useState<string | null>(null);
const [isQuestionOpen, setIsQuestionOpen] = useState(false);
const [isIdeaOpen, setIsIdeaOpen] = useState(false);
const [revBotMessage, setRevBotMessage] = useState<string>("");
```

#### Data Fetching
- Fetches from `workflows_public` Supabase view
- Falls back to hardcoded workflows if fetch fails
- Sorts by category then title

---

### 7.4 Customer Engagement Page (`/customer-engagement`)

**File**: `src/pages/CustomerEngagement.tsx` (297 lines)

#### Journey Phases

```typescript
const engagementStages = [
  {
    phase: "Customer Learns",
    phaseColor: "bg-pink-500",
    subtitle: "Pipeline Generation (PG)",
    stages: [
      { id: 0, name: "Customer agrees to further discussions", color: "bg-pink-100" },
      { id: 1, name: "Customer is open to change & shares info", color: "bg-pink-200" },
      { id: 2, name: "Customer tells us problems and impacts", color: "bg-pink-300" }
    ]
  },
  {
    phase: "Customer Engages",
    phaseColor: "bg-purple-500",
    subtitle: "Visible Opportunity (VO)",
    stages: [
      { id: 3, name: "Customer tells us benefits of our solution", color: "bg-purple-200" },
      { id: 4, name: "Customer provides access to procurement & legal", color: "bg-purple-300" }
    ]
  },
  {
    phase: "Customer Receives Value",
    phaseColor: "bg-orange-500",
    subtitle: "Value Realization",
    stages: [
      { id: 5, name: "Customer is ready to move forward & purchase", color: "bg-orange-200" },
      { id: 6, name: "Customer actively uses the service & sees value", color: "bg-orange-300" }
    ]
  }
];
```

#### Layout
- Back button to `/workflows`
- Title: "Customer Engagement Process"
- Phase headers with colored bars
- Stage cards in 3-column grid
- Workflow items with launch buttons
- Supporting Roles section at bottom

---

### 7.5 Ask Will Page (`/ask-will`)

**File**: `src/pages/AskWill.tsx`

#### Chat Interface Structure
```tsx
<div className="flex-1 flex flex-col">
  <!-- Header -->
  <div className="text-center p-6">
    <Avatar src={willAvatar} />
    <h2>Ask Will</h2>
    <p>Your AI revenue strategy assistant</p>
  </div>
  
  <!-- Messages Area -->
  <div className="flex-1 overflow-y-auto">
    {messages.map(msg => (
      <div className={msg.role === 'user' ? 'justify-end' : 'justify-start'}>
        {msg.role === 'assistant' && <Avatar />}
        <div className={msg.role === 'user' ? 'bg-secondary' : ''}>
          {msg.content}
        </div>
      </div>
    ))}
    {isLoading && <TypingIndicator />}
  </div>
  
  <!-- Input Area -->
  <div className="p-4 border-t">
    <Textarea placeholder="Ask me anything..." />
    <Button onClick={handleSend}>
      <Send />
    </Button>
  </div>
</div>
```

#### State Variables
```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState("");
const [isLoading, setIsLoading] = useState(false);
```

#### Message Flow
1. User types message
2. Validate with `validateQuery()`
3. Add user message to state
4. Send POST to webhook with:
   - `user_query`
   - `previous_message_1` (last 2 messages context)
   - `previous_message_2`
5. Receive response
6. Add assistant message to state
7. Log to `ask_will_messages` table

---

### 7.6 Ask Will Reasoning Page (`/ask-will-reasoning`)

**File**: `src/pages/AskWillReasoning.tsx`

#### Additional Features
- Example strategic questions displayed as clickable cards
- Uses `react-markdown` for rich formatting
- 5-minute timeout (vs 2 minutes for quick Q&A)
- Logs to `ask_will_reasoning_messages` table

#### Example Questions
```typescript
const exampleQuestions = [
  "What are the key strategic initiatives we should prioritize for Q2...",
  "Analyze the competitive landscape for our enterprise segment...",
  "How should we position our value prop for the healthcare vertical...",
  "What are the potential risks and mitigations for our expansion...",
];
```

---

### 7.7 Insights Page (`/insights`)

**File**: `src/pages/Insights.tsx` (908 lines)

#### Access Control
- Super Admin only
- Redirects to `/` if not authorized

#### Header Controls
- Time range selector: 7d, 14d, 28d, 90d
- Refresh button
- Export CSV button

#### Key Metric Cards (4 columns)
1. **Total Users** - Pink gradient, sparkline
2. **Active Users** - Green gradient, engagement %
3. **Workflow Runs** - Blue gradient, trend arrow
4. **Failures** - Red gradient, failure rate

#### Charts
1. **Daily Active Users** - Area chart with gradient fill
2. **Workflow Categories** - Donut chart

#### Additional Sections
- Period Comparison (First Half vs Second Half)
- Ask Will Usage stats
- Top 10 Users list
- Top 10 Workflows list
- Top 10 Ask Will Users

#### Skeleton Loading States
```tsx
const MetricCardSkeleton = () => (
  <Card>
    <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-4 w-32" />
    </CardContent>
  </Card>
);
```

#### Chart Colors
```typescript
const COLORS = [
  'hsl(345, 100%, 64%)',  // Pendo Pink
  'hsl(55, 98%, 76%)',    // Yellow
  'hsl(200, 80%, 60%)',   // Blue
  'hsl(150, 60%, 50%)',   // Green
  'hsl(280, 70%, 60%)',   // Purple
  'hsl(30, 90%, 60%)'     // Orange
];
```

---

### 7.8 Logs Page (`/logs`)

**File**: `src/pages/Logs.tsx` (394 lines)

#### Table Columns
| # | Column | Description |
|---|--------|-------------|
| 1 | # | Row number |
| 2 | Status | CheckCircle (success) / XCircle (failure) |
| 3 | Retry | Button to re-trigger workflow |
| 4 | Date/Time | Timestamp |
| 5 | User | Name + email |
| 6 | Workflow | Badge with name |
| 7 | Client | Name + website link |
| 8 | SF Account ID | Truncated with tooltip |
| 9 | SF Opportunity ID | Truncated with tooltip |
| 10 | Other Data | Expandable additional fields |

#### Features
- Search filter
- Refresh button
- Retry functionality for failed workflows
- Count badge (filtered/total)

---

### 7.9 Users Page (`/users`)

**File**: `src/pages/Users.tsx` (474 lines)

#### Table Columns
| Column | Description |
|--------|-------------|
| # | Row number |
| User | Avatar + name |
| Email | User email |
| Joined | Created date |
| Last Login | Last login timestamp |
| Workflows Run | Count badge |
| Role | Dropdown selector |
| Actions | View Logs button |

#### Role Management
- Select dropdown: user, editor, super_admin
- Updates via Supabase
- Badge styling by role

#### User Workflow Dialog
- Shows user's workflow history
- Status, date, workflow name, form data

---

### 7.10 Create Workflow Page (`/workflows/create`)

**File**: `src/pages/CreateWorkflow.tsx` (426 lines)

#### Workflow Types
```typescript
type WorkflowType = "regular" | "salesforce-account" | "salesforce-opportunity";
```

#### Form Fields
- Title (required)
- Category (select)
- Short Description (required)
- Long Description (optional)
- Webhook URL (required, validated)
- Stage (Research, Discovery, Proposal, Closing)
- Publish Status (staging/production)
- Roles (multi-select checkboxes)

---

### 7.11 Manage Workflows Page (`/workflows/manage`)

**File**: `src/pages/ManageWorkflows.tsx` (487 lines)

#### Features
- Search filter
- Bulk selection with checkboxes
- Bulk delete
- Edit dialog
- Import default workflows button
- Sync hardcoded workflows to database

#### Table Columns
- Checkbox
- Title
- Category
- Type (Badge)
- Publish Status (Badge)
- Status (Active/Inactive)
- Actions (Edit button)

---

## 8. Components - Complete Documentation

### 8.1 Header

**File**: `src/components/Header.tsx` (258 lines)

#### Structure
```tsx
<header className="w-full bg-card border-b border-border shadow-sm relative">
  <div className="max-w-7xl mx-auto px-6 py-4">
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] items-center gap-4">
      <!-- Logo -->
      <img src={pendoLogo} className="h-16 w-auto" />
      
      <!-- Title -->
      <h1 className="text-xl font-semibold text-center">GTM Hub</h1>
      
      <!-- Navigation -->
      <nav className="flex items-center gap-1 flex-wrap">
        <!-- Demo Hub (external) -->
        <!-- Home link -->
        <!-- Workflows link -->
        <!-- Journey link -->
        <!-- Ask Will dropdown -->
        <!-- Super Admin dropdown (conditional) -->
        <!-- Divider -->
        <!-- Theme toggle -->
        <!-- Need Help? button -->
        <!-- User name + logout -->
      </nav>
    </div>
  </div>
</header>
```

#### State Variables
```typescript
const [isQuestionOpen, setIsQuestionOpen] = useState(false);
const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
  // Initialize from cache
});
```

#### Admin Status Caching
```typescript
const adminStatusCache = new Map<string, boolean>();
```

#### Navigation Link Styling
```typescript
const navLinkClass = (path: string) =>
  cn(
    "h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none",
    location.pathname === path
      ? "bg-secondary text-secondary-foreground"
      : "hover:bg-accent hover:text-accent-foreground"
  );
```

---

### 8.2 WorkflowCard

**File**: `src/components/WorkflowCard.tsx` (81 lines)

```tsx
<Card className="group transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer border border-border bg-card backdrop-blur-sm h-full flex flex-col">
  <CardHeader className="pb-4 flex-1">
    <div className="flex items-start justify-between mb-3">
      <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <Button variant="ghost" size="icon" onClick={onMoreInfo}>
        <Info className="h-4 w-4" />
      </Button>
    </div>
    <CardTitle className="text-xl font-semibold group-hover:text-primary">
      {title}
    </CardTitle>
    <CardDescription>{description}</CardDescription>
    <div className="flex flex-wrap gap-2">
      {stage && <Badge variant="secondary">{stage}</Badge>}
      {roles.slice(0, 2).map(role => <Badge variant="outline">{role}</Badge>)}
      {roles.length > 2 && <Badge variant="outline">+{roles.length - 2} more</Badge>}
    </div>
  </CardHeader>
  <CardContent className="pt-0">
    <Button onClick={onLaunch} className="w-full">Start Workflow</Button>
  </CardContent>
</Card>
```

#### Props
```typescript
interface WorkflowCardProps {
  workflow: Workflow;
  onLaunch: (workflow: Workflow) => void;
  onMoreInfo: (workflow: Workflow) => void;
}
```

---

### 8.3 WorkflowForm

**File**: `src/components/WorkflowForm.tsx` (166 lines)

#### Features
- Dialog-based form
- Dynamic fields from `workflow.parameters`
- Auto-populates email and name from user profile
- Email validation for @pendo.io domain
- Loading state with spinner

#### Props
```typescript
interface WorkflowFormProps {
  workflow: Workflow | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (workflow: Workflow, data: Record<string, string>) => void;
  isLoading: boolean;
}
```

---

### 8.4 WorkflowDrawer

**File**: `src/components/WorkflowDrawer.tsx` (76 lines)

```tsx
<Sheet open={isOpen} onOpenChange={onClose}>
  <SheetContent className="w-[400px] sm:w-[540px]">
    <SheetHeader>
      <SheetTitle>
        <Icon /> {workflow.title}
      </SheetTitle>
      <SheetDescription>About this workflow</SheetDescription>
    </SheetHeader>
    <div className="mt-6 space-y-6">
      <div>
        <h4>Description</h4>
        <p>{workflow.longDescription || workflow.description}</p>
      </div>
      <div>
        <h4>Relevant Roles</h4>
        {workflow.roles.map(role => <Badge>{role}</Badge>)}
      </div>
      <Button>Launch Workflow</Button>
    </div>
  </SheetContent>
</Sheet>
```

---

### 8.5 StrategyHero (RevBot)

**File**: `src/components/StrategyHero.tsx` (175 lines)

#### Minimized State
```tsx
<div className="fixed right-6 bottom-6 z-50 animate-float">
  <button onClick={() => setIsMinimized(false)} className="relative group">
    <div className="absolute -inset-2 bg-gradient-to-r from-pendo-pink to-primary rounded-full opacity-75 blur" />
    <img src={strategyHeroImage} className="h-20 w-20 rounded-full border-4" />
    <div className="absolute -top-1 -right-1 h-4 w-4 bg-pendo-pink rounded-full animate-pulse" />
  </button>
</div>
```

#### Expanded State
```tsx
<Card className="w-80 shadow-2xl border-2 border-primary/20">
  <!-- Minimize button -->
  <!-- Avatar with glow -->
  <h3>Hey! I'm RevBot 🚀</h3>
  {displayMessage ? (
    <div className="bg-pendo-pink/10">{displayMessage}</div>
  ) : (
    <p>Description...</p>
  )}
  <!-- Feature list -->
  <Button onClick={onNeedHelp}>Need Help?</Button>
  <Button onClick={onGotIdea}>Got an Idea?</Button>
</Card>
```

#### State Variables
```typescript
const [isMinimized, setIsMinimized] = useState(true);
const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
const [displayMessage, setDisplayMessage] = useState<string>("");
```

#### Behavior
- Starts minimized
- Auto-expands after 10-15 seconds (random)
- Remembers minimized state in sessionStorage
- Can display messages from workflow launches
- Auto-hides message after 5 seconds

---

### 8.6 MatrixRain

**File**: `src/components/MatrixRain.tsx` (133 lines)

#### Canvas Animation
- Characters: Binary (`01`) + Japanese katakana
- Pendo words: `PENDO`, `GUIDE`, `INSIGHTS`, `ANALYTICS`, `PRODUCT`, `EXPERIENCE`, `DATA`, `FEEDBACK`, `SURVEY`, `NPS`
- Font size: 14px monospace
- Color: Pendo Pink from CSS variables
- Background: Solid black with trailing effect
- Resize handling via ResizeObserver

```typescript
const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const pendoWords = ['PENDO', 'GUIDE', 'INSIGHTS', 'ANALYTICS', 'PRODUCT', 'EXPERIENCE', 'DATA', 'FEEDBACK', 'SURVEY', 'NPS'];
```

---

### 8.7 QuestionDialog

**File**: `src/components/QuestionDialog.tsx` (166 lines)

#### Form Fields
- Email (required)
- Workflow (required)
- Your Name (required)
- Notes (required, textarea)

#### Validation
- Zod schema validation
- Email: valid format, max 255 chars
- Workflow: required, max 200 chars
- Notes: required, max 1000 chars
- Your_Name: required, max 120 chars

#### Submission
- Sends to `send-slack-message` edge function
- Adds source context prefix for "idea" vs "help"

---

### 8.8 EmptyState

**File**: `src/components/EmptyState.tsx` (37 lines)

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="p-4 rounded-full bg-muted/50 mb-4">
    <SearchX className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3>No workflows found</h3>
  <p>{message}</p>
  {hasFilters && <Button onClick={onClearFilters}>Clear filters</Button>}
</div>
```

---

### 8.9 HelpModal

**File**: `src/components/HelpModal.tsx` (58 lines)

- Getting Started info
- Launching Workflows info
- Contact GTM Ops button
- Request new workflow info

---

### 8.10 WorkflowCreator

**File**: `src/components/WorkflowCreator.tsx` (329 lines)

- Dialog for creating workflows
- Dynamic parameter builder
- Role selection with badges
- Icon selector
- Sample payload JSON editor

---

### 8.11 ThemeWrapper

**File**: `src/components/ThemeWrapper.tsx` (10 lines)

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  {children}
</ThemeProvider>
```

---

## 9. UI Components (shadcn/ui)

### 9.1 Button

**File**: `src/components/ui/button.tsx`

#### Variants
| Variant | Classes |
|---------|---------|
| default | `bg-primary text-primary-foreground hover:bg-primary/90` |
| destructive | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| outline | `border border-input bg-background hover:bg-accent hover:text-accent-foreground` |
| secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| ghost | `hover:bg-accent hover:text-accent-foreground` |
| link | `text-primary underline-offset-4 hover:underline` |

#### Sizes
| Size | Classes |
|------|---------|
| default | `h-10 px-4 py-2` |
| sm | `h-9 rounded-md px-3` |
| lg | `h-11 rounded-md px-8` |
| icon | `h-10 w-10` |

#### Base Classes
```
inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
```

---

### 9.2 Card

**File**: `src/components/ui/card.tsx`

| Component | Classes |
|-----------|---------|
| Card | `rounded-lg border bg-card text-card-foreground shadow-sm` |
| CardHeader | `flex flex-col space-y-1.5 p-6` |
| CardTitle | `text-2xl font-semibold leading-none tracking-tight` |
| CardDescription | `text-sm text-muted-foreground` |
| CardContent | `p-6 pt-0` |
| CardFooter | `flex items-center p-6 pt-0` |

---

### 9.3 Badge

**File**: `src/components/ui/badge.tsx`

#### Base Classes
```
inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
```

#### Variants
| Variant | Classes |
|---------|---------|
| default | `border-transparent bg-primary text-primary-foreground hover:bg-primary/80` |
| secondary | `border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| destructive | `border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80` |
| outline | `text-foreground` |

---

### 9.4 Input

**File**: `src/components/ui/input.tsx`

```
flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm
```

---

### 9.5 Textarea

**File**: `src/components/ui/textarea.tsx`

```
flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
```

---

### 9.6 Dialog

**File**: `src/components/ui/dialog.tsx`

| Component | Key Classes |
|-----------|-------------|
| DialogOverlay | `fixed inset-0 z-50 bg-black/80` |
| DialogContent | `fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg` |
| DialogHeader | `flex flex-col space-y-1.5 text-center sm:text-left` |
| DialogTitle | `text-lg font-semibold leading-none tracking-tight` |
| DialogDescription | `text-sm text-muted-foreground` |

---

### 9.7 Sheet (Drawer)

**File**: `src/components/ui/sheet.tsx`

#### Side Variants
| Side | Classes |
|------|---------|
| top | `inset-x-0 top-0 border-b` |
| bottom | `inset-x-0 bottom-0 border-t` |
| left | `inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm` |
| right | `inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm` |

---

### 9.8 Tabs

**File**: `src/components/ui/tabs.tsx`

| Component | Classes |
|-----------|---------|
| TabsList | `inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground` |
| TabsTrigger | `inline-flex items-center justify-center whitespace-normal rounded-sm px-3 py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary` |
| TabsContent | `mt-2 ring-offset-background focus-visible:outline-none` |

---

### 9.9 Select

**File**: `src/components/ui/select.tsx`

Components: Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton

---

### 9.10 Table

**File**: `src/components/ui/table.tsx`

| Component | Classes |
|-----------|---------|
| Table | `w-full caption-bottom text-sm` (wrapped in `overflow-auto`) |
| TableHeader | `[&_tr]:border-b` |
| TableBody | `[&_tr:last-child]:border-0` |
| TableRow | `border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted` |
| TableHead | `h-12 px-4 text-left align-middle font-medium text-muted-foreground` |
| TableCell | `p-4 align-middle` |

---

### 9.11 Dropdown Menu

**File**: `src/components/ui/dropdown-menu.tsx`

- Uses simplified fade transition (opacity-0 to opacity-100)
- 150ms duration
- Prevents layout jumping

---

### 9.12 Accordion

**File**: `src/components/ui/accordion.tsx`

- ChevronDown icon rotates on open
- Content animates with `animate-accordion-down` / `animate-accordion-up`

---

### 9.13 Avatar

**File**: `src/components/ui/avatar.tsx`

| Component | Classes |
|-----------|---------|
| Avatar | `relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full` |
| AvatarImage | `aspect-square h-full w-full` |
| AvatarFallback | `flex h-full w-full items-center justify-center rounded-full bg-muted` |

---

### 9.14 Tooltip

**File**: `src/components/ui/tooltip.tsx`

```
z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95
```

---

### 9.15 Skeleton

**File**: `src/components/ui/skeleton.tsx`

```
animate-pulse rounded-md bg-muted
```

---

### 9.16 ScrollArea

**File**: `src/components/ui/scroll-area.tsx`

- Radix ScrollArea primitive
- Vertical and horizontal scrollbar support
- Scrollbar: `w-2.5` (vertical), `h-2.5` (horizontal)
- Thumb: `rounded-full bg-border`

---

### 9.17 Complete Component List

All installed shadcn/ui components:
- accordion, alert-dialog, alert, aspect-ratio, avatar
- badge, breadcrumb, button
- calendar, card, carousel, chart, checkbox, collapsible, command, context-menu
- dialog, drawer, dropdown-menu
- form
- hover-card
- input-otp, input
- label
- menubar
- navigation-menu
- pagination, popover, progress
- radio-group, resizable
- scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch
- table, tabs, textarea, toast, toaster, toggle-group, toggle, tooltip

---

## 10. Hooks

### 10.1 useAuth

**File**: `src/hooks/useAuth.ts`

```typescript
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  // Update last_login on sign in
  // Domain validation

  return { user, session, loading, signOut, isValidDomain, isAuthenticated };
};
```

---

### 10.2 useCountUp

**File**: `src/hooks/useCountUp.ts`

```typescript
export const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  
  // Uses requestAnimationFrame
  // easeOutQuart easing function
  
  return count;
};
```

**Easing**: `1 - Math.pow(1 - progress, 4)` (easeOutQuart)

---

### 10.3 useIsMobile

**File**: `src/hooks/use-mobile.tsx`

```typescript
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  
  // Uses matchMedia API
  // Listens to resize events
  
  return !!isMobile;
}
```

---

### 10.4 useToast

**File**: `src/hooks/use-toast.ts`

```typescript
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

function useToast() {
  return {
    toasts: ToasterToast[],
    toast: (props: Toast) => { id, dismiss, update },
    dismiss: (toastId?: string) => void,
  };
}
```

---

## 11. Utilities & Libraries

### 11.1 cn (Class Names)

**File**: `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### 11.2 Validation Schemas

**File**: `src/lib/validation.ts`

```typescript
export const querySchema = z.string().trim().min(1).max(5000);
export const clientNameSchema = z.string().trim().min(1).max(200);
export const clientWebsiteSchema = z.string().trim().url().max(500);
export const emailSchema = z.string().trim().email().max(255);
export const nameSchema = z.string().trim().min(1).max(200);
export const salesforceAccountIdSchema = z.string().trim().max(18).optional();
export const opportunityIdSchema = z.string().trim().max(18).optional();

export const workflowFormSchema = z.object({
  'Client Name': clientNameSchema,
  'Client Website': clientWebsiteSchema,
  'Your email ': emailSchema,
  'Your Name': nameSchema,
  'Salesforce Account ID': salesforceAccountIdSchema,
  'SF Opportunity ID': opportunityIdSchema,
}).partial();

export function validateQuery(input: string): { valid: boolean; error?: string; value?: string };
export function validateWorkflowForm(data: Record<string, string>): { valid: boolean; error?: string; value?: Record<string, string> };
```

---

## 12. Data & Types

### 12.1 Workflow Type

**File**: `src/types/workflow.ts`

```typescript
export interface WorkflowParameter {
  name: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'textarea';
  required: boolean;
  placeholder?: string;
}

export interface Workflow {
  id: string;
  title: string;
  category: string;
  description: string;
  roles: string[];
  webhook: string;
  samplePayload: Record<string, any>;
  parameters: WorkflowParameter[];
  icon: LucideIcon;
  stage?: string;
  longDescription?: string;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export const ROLES = ["SDR", "Seller", "SE", "CSM", "Marketing", "Leader", "RevOps"] as const;
export type Role = typeof ROLES[number];
```

---

### 12.2 Workflow Categories

**File**: `src/data/workflows.ts`

```typescript
export const categories = [
  "AI-Powered Research & Strategy Briefs",
  "Call/Transcript-Based Intelligence",
  "AI Audio Research & Briefings",
  "Evaluations Assistant AI (opp based)",
  "Portfolio Intelligence",
  "CX",
  "Personality & Behavioral Research"
] as const;
```

---

### 12.3 Hardcoded Workflows

15+ pre-defined workflows including:
- Account Research
- Value Hypothesis
- Strategy Map
- Account Overview Deck
- Transcript-Based Value Hypothesis
- AI-Powered Client Relationship Intelligence
- Joint Value Plan (JVP)
- Last Meeting Snapshot
- Strategic Evaluation: 3 Whys Framework
- ROI Generator
- Strategic Account Audio Brief
- AE Portfolio Review
- Pendo Evaluation Assistant
- And more...

---

## 13. Edge Functions (Backend)

### 13.1 trigger-workflow

**File**: `supabase/functions/trigger-workflow/index.ts`

#### Purpose
Securely triggers workflow webhooks without exposing webhook URLs to client

#### Flow
1. Verify auth header
2. Get user from token
3. Parse workflowId and formData from request body
4. Fetch workflow from database (with service role)
5. Build webhook URL with query parameters
6. Call webhook with POST request
7. Log workflow run to database
8. Return success/error response

#### Special Handling
- Portfolio Intelligence workflows: query params only, no body
- Other workflows: data in both body AND query params

---

### 13.2 send-slack-message

**File**: `supabase/functions/send-slack-message/index.ts`

#### Purpose
Sends help/idea requests to Slack channel

#### Flow
1. Verify auth header
2. Parse email, Workflow, Notes, Your_Name from request body
3. Validate input lengths
4. Send to Slack webhook
5. Return success/error response

#### Environment Variables
- `SLACK_WEBHOOK_URL` - Slack incoming webhook URL

---

## 14. Database Schema

### 14.1 Tables

#### profiles
```sql
id: UUID (PK)
email: string | null
full_name: string | null
avatar_url: string | null
created_at: timestamp
updated_at: timestamp
last_login: timestamp | null
```

#### user_roles
```sql
id: UUID (PK)
user_id: UUID
role: app_role ('user' | 'editor' | 'super_admin')
```

#### workflows
```sql
id: UUID (PK)
title: string
description: string
long_description: string | null
category: string
webhook_url: string
stage: string | null
roles: string[]
workflow_type: string
created_by: UUID
created_at: timestamp
updated_at: timestamp
is_active: boolean
publish_status: string ('staging' | 'production')
original_id: string | null
```

#### workflow_runs
```sql
id: UUID (PK)
user_id: UUID
workflow_id: string
workflow_name: string
form_data: JSON
created_at: timestamp
status: string ('success' | 'failure')
error_message: string | null
```

#### ask_will_messages
```sql
id: UUID (PK)
user_id: UUID
user_query: string
assistant_response: string | null
created_at: timestamp
```

#### ask_will_reasoning_messages
```sql
id: UUID (PK)
user_id: UUID
user_query: string
assistant_response: string | null
created_at: timestamp
```

### 14.2 Views

#### workflows_public
- Exposes active, published workflows without webhook_url
- For client-side workflow listing

### 14.3 Enums

```sql
app_role: 'user' | 'editor' | 'super_admin'
```

### 14.4 Functions

```sql
has_role(_role: app_role, _user_id: UUID) → boolean
```

---

## 15. Animations & Effects

### 15.1 Tailwind Keyframes

**File**: `tailwind.config.ts`

```typescript
keyframes: {
  'accordion-down': {
    from: { height: '0' },
    to: { height: 'var(--radix-accordion-content-height)' }
  },
  'accordion-up': {
    from: { height: 'var(--radix-accordion-content-height)' },
    to: { height: '0' }
  },
  'float': {
    '0%, 100%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-10px)' }
  }
}

animation: {
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up': 'accordion-up 0.2s ease-out',
  'float': 'float 3s ease-in-out infinite'
}
```

### 15.2 CSS Animations

**File**: `src/index.css`

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
```

### 15.3 Animation Usage

| Animation | Usage |
|-----------|-------|
| `animate-spin` | Loading spinners |
| `animate-pulse` | RevBot notification dot |
| `animate-float` | Integration logos, floating action bar, RevBot avatar |
| `animate-accordion-down/up` | FAQ accordions |
| `animate-fade-in` | Stat cards on Home page |

### 15.4 Transition Classes

```css
transition-all duration-300    /* Card hover effects */
transition-colors              /* Button hover */
transition-transform duration-200 /* Icon rotations */
transition-opacity duration-150   /* Dropdown menus */
```

---

## 16. Icons

### 16.1 Lucide React Icons Used

**Navigation & Actions**
- ChevronDown, ChevronRight, ChevronUp
- ArrowLeft, ArrowUpRight, ArrowDownRight
- ExternalLink, X, Plus, Minus
- RefreshCw, Download, Upload, Search
- Edit, Trash2, Save, Copy

**Status & Feedback**
- CheckCircle, XCircle, AlertTriangle
- Loader2, Info, HelpCircle
- Shield, ShieldAlert

**Features & Content**
- Workflow, Bot, Zap, Target
- TrendingUp, TrendingDown, Activity
- FileText, FolderKanban
- MessageSquare, MessageCircle
- Mic, Lightbulb, Map, Briefcase
- Calendar, History, BarChart3, Brain

**Users & Auth**
- Users, UserPlus, LogOut
- Sun, Moon

**Social & Integrations**
- Slack, Send, Mail

### 16.2 Icon Sizing Convention

| Context | Size | Class |
|---------|------|-------|
| Inline text | 16px | `h-4 w-4` |
| Buttons | 16px | `h-4 w-4` |
| Card icons | 24px | `h-6 w-6` |
| Large features | 32px | `h-8 w-8` |

---

## 17. Assets

### 17.1 Images

**Logos**
- `src/assets/pendo-logo.png` - Full Pendo logo
- `src/assets/pendo-logo-twitter.png` - Pendo logo (used in header)
- `src/assets/logos/claude-new.png`
- `src/assets/logos/gemini-final.png`
- `src/assets/logos/google-docs.png`
- `src/assets/logos/google-drive.png`
- `src/assets/logos/google-sheets.png`
- `src/assets/logos/google-slides.png`
- `src/assets/logos/gmail.png`
- `src/assets/logos/n8n-final.png`
- `src/assets/logos/openai-final.png`
- `src/assets/logos/salesforce.png`
- `src/assets/logos/slack.png`
- `src/assets/logos/zapier-final.png`

**Avatars**
- `src/assets/ace-avatar.png` - Ace assistant
- `src/assets/will-avatar.png` - Will assistant
- `src/assets/rfp-avatar.png` - RFP assistant
- `src/assets/strategy-hero.png` - RevBot avatar

---

## 18. State Management

### 18.1 Server State (React Query)

```typescript
const queryClient = new QueryClient();
```

Currently not heavily used - most data fetching is done with direct Supabase calls in components.

### 18.2 Local State Patterns

**Component State**
```typescript
// Loading states
const [loading, setLoading] = useState(true);
const [isLoading, setIsLoading] = useState<string | null>(null);

// Modal/Dialog states
const [isOpen, setIsOpen] = useState(false);
const [isDialogOpen, setIsDialogOpen] = useState(false);

// Form data
const [formData, setFormData] = useState({ ... });

// Selection
const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

### 18.3 Persistence

**localStorage**
- `workflowStats` - Workflow run counts and hours saved

**sessionStorage**
- `revbot-minimized` - RevBot minimized state

**Memory Cache**
- `adminStatusCache` - Map for caching super admin status

---

## 19. Error Handling

### 19.1 Toast Notifications

**Two Toast Systems**:
1. shadcn/ui toast (`useToast` hook)
2. Sonner (`toast` from 'sonner')

**Usage Pattern**:
```typescript
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

// shadcn/ui toast
const { toast } = useToast();
toast({
  title: "Success",
  description: "Operation completed",
  variant: "default" | "destructive",
});

// Sonner toast
toast.success("Success message");
toast.error("Error message");
```

### 19.2 Error States

- Loading spinners during async operations
- Empty state components for no data
- Error toast messages for failures
- Tooltip explanations for failures in logs
- Console.error for debugging

### 19.3 Validation Errors

- Zod schema validation
- Form field error messages
- Email domain validation feedback
- Required field indicators (red asterisk)

---

## 20. Accessibility

### 20.1 Current Features

- Semantic HTML structure
- ARIA labels on buttons (`title` attribute, `aria-label`)
- Screen reader text (`sr-only` class)
- Focus states on interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Color contrast compliance
- Focus rings (`focus-visible:ring-2`)

### 20.2 Specific Implementations

```tsx
// Screen reader only text
<span className="sr-only">Close</span>
<span className="sr-only">Toggle theme</span>

// Accessible buttons
<Button title="Sign out">
  <LogOut className="h-4 w-4" />
</Button>

// Focus states
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2

// Disabled states
disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed
```

---

## 21. Responsive Design

### 21.1 Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| sm | 640px | Small tablets |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1400px | Large screens |

### 21.2 Container Configuration

```typescript
container: {
  center: true,
  padding: '2rem',
  screens: {
    '2xl': '1400px'
  }
}
```

### 21.3 Responsive Patterns

**Grid Layouts**
```css
grid-cols-1 md:grid-cols-2 lg:grid-cols-3
grid-cols-1 lg:grid-cols-[auto_1fr_auto]
```

**Flex Wrap**
```css
flex flex-wrap gap-4 justify-center lg:justify-end
```

**Text Sizing**
```css
text-2xl md:text-3xl
text-5xl md:text-6xl
```

**Visibility**
```css
hidden sm:inline
sm:hidden
```

**Spacing**
```css
px-4 md:px-6
py-8 md:py-12
```

---

## Appendix A: File Structure

```
src/
├── App.tsx
├── App.css
├── main.tsx
├── index.css
├── vite-env.d.ts
├── assets/
│   ├── logos/
│   ├── ace-avatar.png
│   ├── pendo-logo.png
│   ├── pendo-logo-twitter.png
│   ├── rfp-avatar.png
│   ├── strategy-hero.png
│   └── will-avatar.png
├── components/
│   ├── ui/ (40+ shadcn components)
│   ├── AppLayout.tsx
│   ├── EmptyState.tsx
│   ├── Header.tsx
│   ├── HelpModal.tsx
│   ├── MatrixRain.tsx
│   ├── ProtectedRoute.tsx
│   ├── QuestionDialog.tsx
│   ├── SnowFall.tsx
│   ├── StrategyHero.tsx
│   ├── ThemeWrapper.tsx
│   ├── WorkflowCard.tsx
│   ├── WorkflowCreator.tsx
│   ├── WorkflowDrawer.tsx
│   └── WorkflowForm.tsx
├── data/
│   └── workflows.ts
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ├── useAuth.ts
│   └── useCountUp.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── lib/
│   ├── utils.ts
│   └── validation.ts
├── pages/
│   ├── AskAce.tsx
│   ├── AskRFP.tsx
│   ├── AskWill.tsx
│   ├── AskWillReasoning.tsx
│   ├── Auth.tsx
│   ├── CreateWorkflow.tsx
│   ├── CustomerEngagement.tsx
│   ├── Home.tsx
│   ├── Index.tsx
│   ├── Insights.tsx
│   ├── Logs.tsx
│   ├── ManageWorkflows.tsx
│   ├── NotFound.tsx
│   ├── PublicWorkflow.tsx
│   └── Users.tsx
└── types/
    └── workflow.ts

supabase/
├── config.toml
└── functions/
    ├── send-slack-message/
    │   └── index.ts
    └── trigger-workflow/
        └── index.ts
```

---

## Appendix B: Environment Variables

**Client-side (.env)**
```
VITE_SUPABASE_URL=https://dedgyyzjhrzxppmqzctw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_SUPABASE_PROJECT_ID=dedgyyzjhrzxppmqzctw
```

**Edge Functions**
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SLACK_WEBHOOK_URL
```

---

*This comprehensive documentation covers every aspect of the GTM Hub dashboard UI as of January 14, 2026.*
