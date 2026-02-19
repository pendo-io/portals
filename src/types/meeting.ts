export interface MomentumMeeting {
  id: string;
  title: string;
  startTime: string; // ISO 8601
  endTime: string;
  host?: { email: string; name: string };
  attendees?: Array<{ name: string; email: string; isInternal: boolean }>;
  transcript?: {
    entries: Array<{ speaker: { name: string }; text: string }>;
  };
  salesforceAccountId?: string;
  salesforceOpportunityId?: string;
  summary?: string;
  sentiment?: string;
  keyTopics?: string[];
  decisions?: string[];
  risks?: string[];
  actionItems?: Array<{ text: string; assignee?: string; priority?: string }>;
}
