 export interface ActionItem {
   task: string;
   owner: string;
   priority: "high" | "medium" | "low";
   dueDate?: string;
 }
 
 export interface AdoptionSignals {
   newUsers: string[];
   existingUserGrowth: string[];
   productUsage: string[];
 }
 
 export interface MeetingAttendee {
   name: string;
   email: string;
   isInternal: boolean;
 }
 
 export interface MeetingDetail {
   id: string;
   title: string;
   date: string;
   startTime: string;
   endTime: string;
   duration: number;
   attendees: MeetingAttendee[];
   summary: string;
   keyTopics: string[];
   sentiment: "positive" | "neutral" | "negative";
   actionItems: ActionItem[];
   highlights: string[];
   problemsDiscussed?: string[];
   problemsResolved?: string[];
   adoptionSignals?: AdoptionSignals;
 }
 
 export interface MonthlySummary {
   month: string;
   monthLabel: string;
   meetingCount: number;
   totalDuration: number;
   sentimentBreakdown: { positive: number; neutral: number; negative: number };
   topTopics: string[];
   keyHighlights: string[];
   overallMood: "positive" | "neutral" | "negative";
   briefSummary?: string;
   problemsIdentified: string[];
   problemsResolved: string[];
   adoptionSignals: AdoptionSignals;
   openIssues: string[];
 }
 
 export interface AccountCoreData {
   arr?: number;
   renewalDate?: string;
   healthScore?: string;
   priorityTier?: string;
   customerSince?: string;
 }
 
 export interface ExecutiveContext {
   relationshipHealth: string;
   engagementPattern: string;
   keyStakeholders: string[];
   criticalMoments: string[];
   nextSteps: string[];
 }
 
 export interface AccountMeetingInsights {
   accountId: string;
   accountName: string;
   accountCoreData: AccountCoreData;
   totalMeetings: number;
   totalDuration: number;
   sentimentBreakdown: { positive: number; neutral: number; negative: number };
   overallSentiment: "positive" | "neutral" | "negative";
   keyTopics: string[];
   meetingFrequency: string;
   engagementTrend: "increasing" | "stable" | "decreasing";
   productMentions: string[];
   adoptionSignals: string[];
   riskSignals: string[];
   opportunitySignals: string[];
   meetings: MeetingDetail[];
   monthlySummaries: MonthlySummary[];
   executiveSummary: string;
   executiveContext: ExecutiveContext;
   actionRecommendations: string[];
 
   // NEW: Stakeholder Analysis
   stakeholders: StakeholderAnalysis[];
   champions: ChampionInfo[];
 
   // NEW: Opportunity & Renewal
   opportunityPicks: OpportunityPick[];
   renewalConcerns: RenewalConcern[];
 
   // NEW: Recent priority actions (last 2 weeks)
   recentPriorityActions: PriorityAction[];
 }
 
 export interface StakeholderAnalysis {
   name: string;
   email: string;
   role?: string;
   influence: "high" | "medium" | "low";
   sentiment: "positive" | "neutral" | "negative";
   engagementLevel: "active" | "moderate" | "low";
   lastMeetingDate?: string;
   approachSuggestion: string;
 }
 
 export interface ChampionInfo {
   name: string;
   email: string;
   role?: string;
   championSignals: string[];
   recommendedAction: string;
 }
 
 export interface OpportunityPick {
   title: string;
   description: string;
   potentialValue: "high" | "medium" | "low";
   signals: string[];
   suggestedApproach: string;
 }
 
 export interface RenewalConcern {
   concern: string;
   severity: "critical" | "moderate" | "low";
   evidence: string[];
   mitigationStrategy: string;
 }
 
 export interface PriorityAction {
   action: string;
   owner: string;
   priority: "high" | "medium" | "low";
   dueDate?: string;
   context: string;
   meetingDate: string;
 }

// Management Brief Types
export interface ManagementBriefData {
  accountId: string;
  accountName: string;
  displayName: string; // User-editable name
  generatedAt: string;
  periodCovered: string;
  
  // Overview Section
  overview: {
    executiveNarrative: string;
    executiveContext: string; // Deep situational context
    relationshipJourney: string; // How we got here
    currentState: string; // Where we are now
    futureDirection: string; // Where we're heading
    accountHealth: "healthy" | "stable" | "at-risk" | "critical";
    healthScore: number; // 1-100
    healthRationale: string;
    engagementLevel: string;
    momentum: "accelerating" | "steady" | "slowing" | "stalled";
  };
  
  // Use Case Focus (up to 3 detailed use cases)
  useCaseFocus: {
    useCaseName: string;
    description: string;
    currentStatus: "active" | "exploring" | "piloting" | "expanding" | "at-risk";
    adoptionStage: string;
    keyStakeholders: string[];
    successMetrics: string[];
    challenges: string[];
    opportunities: string[];
    recommendedActions: string[];
    timeline: string;
    businessValue: string;
  }[];
  
  // Meeting Stats
  meetingStats: {
    totalMeetings: number;
    totalHours: number;
    averageSentiment: number; // -1 to 1
    sentimentTrend: "improving" | "stable" | "declining";
  };
  
  // Key Highlights
  majorHighlights: {
    title: string;
    description: string;
    date: string;
    impact: "high" | "medium" | "low";
  }[];
  
  // Big Wins
  bigWins: {
    title: string;
    description: string;
    date: string;
    businessImpact: string;
  }[];
  
  // Main Issues (Top 3)
  mainIssues: {
    issue: string;
    severity: "critical" | "high" | "medium";
    description: string;
    evidence: string[];
    suggestedResolution: string;
    status: "open" | "in-progress" | "resolved";
  }[];
  
  // Comprehensive Stakeholder Breakdown
  stakeholderBreakdown: {
    name: string;
    email: string;
    title?: string;
    department?: string;
    influence: "executive" | "decision-maker" | "influencer" | "user";
    engagement: "highly-engaged" | "engaged" | "moderate" | "low" | "disengaged";
    sentiment: "advocate" | "positive" | "neutral" | "skeptical" | "detractor";
    meetingCount: number;
    lastSeen: string;
    keyQuotes?: string[];
    concerns?: string[];
    interests?: string[];
    relationshipNotes: string;
    recommendedApproach: string;
  }[];
  
  // Sentiment Analysis
  sentimentAnalysis: {
    overallScore: number; // 1-10
    breakdown: {
      positive: number;
      neutral: number;
      negative: number;
    };
    trendAnalysis: string;
    keyPositiveDrivers: string[];
    keyNegativeDrivers: string[];
    sentimentByStakeholder: {
      name: string;
      score: number;
      trend: "up" | "stable" | "down";
    }[];
  };
  
  // Forward Looking
  outlook: {
    trajectory: string;
    nextSteps: string[];
    risksToWatch: string[];
    opportunities: string[];
  };
}