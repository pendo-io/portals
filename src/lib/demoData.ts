import type { SfdcQueryResult } from "./sfdc";
import type { SfdcLead } from "@/hooks/useSfdcLeads";
import type { SfdcOpportunity } from "@/hooks/useSfdcOpportunities";
import type { SfdcLeadDetail } from "@/hooks/useSfdcLeadDetail";
import type { SfdcOpportunityDetail } from "@/hooks/useSfdcOpportunityDetail";
import type { SfdcApprovalStep } from "@/hooks/useSfdcApprovalHistory";
import type { SfdcBillingInstallment } from "@/hooks/useSfdcBillingInstallments";
import type { AdminUser } from "@/hooks/useAdmin";

// ── Demo user identity ──────────────────────────────────────────────
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export function isDemoMode(impersonatingId: string | undefined | null): boolean {
  return impersonatingId === DEMO_USER_ID;
}

export const DEMO_ADMIN_USER: AdminUser = {
  id: DEMO_USER_ID,
  email: "demo@example.com",
  full_name: "Demo User",
  partner_id: "demo-partner",
  created_at: "2025-01-01T00:00:00Z",
  partners: {
    id: "demo-partner",
    name: "Acme Partners",
    type: "partner",
    sfdc_account_id: null,
    owner_id: null,
  },
  user_roles: [{ role: "user" }],
};

// ── Helpers ─────────────────────────────────────────────────────────
function demoId(n: number) {
  return `DEMO${String(n).padStart(15, "0")}`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ── Leads ───────────────────────────────────────────────────────────
const DEMO_LEADS: SfdcLead[] = [
  { Id: demoId(1), Name: "Sarah Chen", FirstName: "Sarah", LastName: "Chen", Company: "Northwind Solutions", Email: "s.chen@northwind.example", Website: null, Status: "Working", LeadSource: "Partner Referral", CreatedDate: daysAgo(2) },
  { Id: demoId(2), Name: "Marcus Johnson", FirstName: "Marcus", LastName: "Johnson", Company: "Contoso Ltd", Email: "m.johnson@contoso.example", Website: null, Status: "New", LeadSource: "Partner Referral", CreatedDate: daysAgo(5) },
  { Id: demoId(3), Name: "Priya Patel", FirstName: "Priya", LastName: "Patel", Company: "Fabrikam Inc", Email: "p.patel@fabrikam.example", Website: null, Status: "Qualified", LeadSource: "Partner Referral", CreatedDate: daysAgo(8) },
  { Id: demoId(4), Name: "James Wilson", FirstName: "James", LastName: "Wilson", Company: "Tailspin Toys", Email: "j.wilson@tailspin.example", Website: null, Status: "Working", LeadSource: "Partner Referral", CreatedDate: daysAgo(12) },
  { Id: demoId(5), Name: "Elena Rodriguez", FirstName: "Elena", LastName: "Rodriguez", Company: "Adventure Works", Email: "e.rodriguez@adventureworks.example", Website: null, Status: "New", LeadSource: "Partner Referral", CreatedDate: daysAgo(15) },
  { Id: demoId(6), Name: "David Kim", FirstName: "David", LastName: "Kim", Company: "Woodgrove Bank", Email: "d.kim@woodgrove.example", Website: null, Status: "Qualified", LeadSource: "Partner Referral", CreatedDate: daysAgo(20) },
  { Id: demoId(7), Name: "Aisha Mohammed", FirstName: "Aisha", LastName: "Mohammed", Company: "Litware Inc", Email: "a.mohammed@litware.example", Website: null, Status: "Unqualified", LeadSource: "Partner Referral", CreatedDate: daysAgo(25) },
  { Id: demoId(8), Name: "Tom Schneider", FirstName: "Tom", LastName: "Schneider", Company: "Proseware GmbH", Email: "t.schneider@proseware.example", Website: null, Status: "New", LeadSource: "Partner Referral", CreatedDate: daysAgo(1) },
  { Id: demoId(9), Name: "Yuki Tanaka", FirstName: "Yuki", LastName: "Tanaka", Company: "Fourth Coffee", Email: "y.tanaka@fourthcoffee.example", Website: null, Status: "Working", LeadSource: "Partner Referral", CreatedDate: daysAgo(18) },
  { Id: demoId(10), Name: "Rachel Green", FirstName: "Rachel", LastName: "Green", Company: "Margie's Travel", Email: "r.green@margies.example", Website: null, Status: "Qualified", LeadSource: "Partner Referral", CreatedDate: daysAgo(30) },
  { Id: demoId(11), Name: "Luis Hernandez", FirstName: "Luis", LastName: "Hernandez", Company: "Wide World Importers", Email: "l.hernandez@wideworldimporters.example", Website: null, Status: "New", LeadSource: "Partner Referral", CreatedDate: daysAgo(3) },
  { Id: demoId(12), Name: "Nina Petrova", FirstName: "Nina", LastName: "Petrova", Company: "Relecloud", Email: "n.petrova@relecloud.example", Website: null, Status: "Working", LeadSource: "Partner Referral", CreatedDate: daysAgo(10) },
];

const DEMO_LEAD_DETAILS: Record<string, SfdcLeadDetail> = Object.fromEntries(
  DEMO_LEADS.map((l) => [
    l.Id,
    {
      ...l,
      Website: `https://${l.Company.toLowerCase().replace(/\s+/g, "")}.example`,
      Owner: { Name: "Alex Morgan" },
      CreatedBy: { Name: "Demo User" },
      Street: "123 Main Street",
      City: "San Francisco",
      State: "CA",
      PostalCode: "94105",
      Country: "US",
      Referral_Partner_Account__c: null,
      Referral_Partner_Account__r: { Name: "Acme Partners" },
      Number_of_Users__c: Math.floor(Math.random() * 5000) + 100,
      Current_Tech_Stack_Solutions__c: "Salesforce, HubSpot, Mixpanel",
      Department_s__c: "Product, Engineering",
      Use_Case__c: "Product Analytics",
      Competitors_Considered_or_Incumbent__c: "Amplitude, Heap",
      Additional_Information__c: "Interested in enterprise plan with SSO.",
    } satisfies SfdcLeadDetail,
  ])
);

// ── Opportunities ───────────────────────────────────────────────────
const DEMO_OPPORTUNITIES: SfdcOpportunity[] = [
  { Id: demoId(101), Name: "Northwind Solutions - Enterprise", Account: { Name: "Northwind Solutions" }, StageName: "Negotiation", Amount: 185000, CloseDate: daysFromNow(14), LeadSource: "Partner Referral", CreatedDate: daysAgo(45) },
  { Id: demoId(102), Name: "Contoso Ltd - Platform License", Account: { Name: "Contoso Ltd" }, StageName: "Discovery", Amount: 72000, CloseDate: daysFromNow(45), LeadSource: "Partner Referral", CreatedDate: daysAgo(30) },
  { Id: demoId(103), Name: "Fabrikam Inc - Expansion", Account: { Name: "Fabrikam Inc" }, StageName: "Proposal", Amount: 240000, CloseDate: daysFromNow(21), LeadSource: "Partner Referral", CreatedDate: daysAgo(60) },
  { Id: demoId(104), Name: "Tailspin Toys - Starter", Account: { Name: "Tailspin Toys" }, StageName: "Qualification", Amount: 36000, CloseDate: daysFromNow(60), LeadSource: "Partner Referral", CreatedDate: daysAgo(10) },
  { Id: demoId(105), Name: "Adventure Works - Renewal", Account: { Name: "Adventure Works" }, StageName: "Closed Won", Amount: 150000, CloseDate: daysAgo(5).split("T")[0], LeadSource: "Partner Referral", CreatedDate: daysAgo(90) },
  { Id: demoId(106), Name: "Woodgrove Bank - Analytics Suite", Account: { Name: "Woodgrove Bank" }, StageName: "Negotiation", Amount: 320000, CloseDate: daysFromNow(30), LeadSource: "Partner Referral", CreatedDate: daysAgo(40) },
  { Id: demoId(107), Name: "Litware Inc - POC", Account: { Name: "Litware Inc" }, StageName: "Closed Lost", Amount: 48000, CloseDate: daysAgo(15).split("T")[0], LeadSource: "Partner Referral", CreatedDate: daysAgo(75) },
  { Id: demoId(108), Name: "Proseware GmbH - Growth Plan", Account: { Name: "Proseware GmbH" }, StageName: "Discovery", Amount: 95000, CloseDate: daysFromNow(50), LeadSource: "Partner Referral", CreatedDate: daysAgo(7) },
  { Id: demoId(109), Name: "Fourth Coffee - Migration", Account: { Name: "Fourth Coffee" }, StageName: "Proposal", Amount: 128000, CloseDate: daysFromNow(35), LeadSource: "Partner Referral", CreatedDate: daysAgo(55) },
  { Id: demoId(110), Name: "Relecloud - Enterprise Rollout", Account: { Name: "Relecloud" }, StageName: "Qualification", Amount: 210000, CloseDate: daysFromNow(70), LeadSource: "Partner Referral", CreatedDate: daysAgo(14) },
];

const DEMO_OPP_DETAILS: Record<string, SfdcOpportunityDetail> = Object.fromEntries(
  DEMO_OPPORTUNITIES.map((o) => [
    o.Id,
    {
      ...o,
      Owner: { Name: "Alex Morgan" },
      CreatedBy: { Name: "Demo User" },
      Probability: o.StageName === "Closed Won" ? 100 : o.StageName === "Closed Lost" ? 0 : o.StageName === "Negotiation" ? 75 : o.StageName === "Proposal" ? 50 : o.StageName === "Discovery" ? 25 : 10,
      Type: "New Business",
      ARR__c: o.Amount,
      ARR_USD__c: o.Amount,
      Net_ARR__c: o.Amount ? o.Amount * 0.85 : null,
      TCV_USD__c: o.Amount ? o.Amount * 2 : null,
      Expiration_Date__c: null,
      Transaction_Type__c: "New",
      Next_Steps__c: "Schedule follow-up call with stakeholders.",
      Pipeline_Date__c: o.CreatedDate.split("T")[0],
      Primary_Competitor_Names__c: "Amplitude",
      Partner_Relationship__c: "Referral",
      Partner_Sub_type__c: null,
      Created_By_Role__c: "Partner",
      Net_ARR_Percentage__c: 85,
      Initial_Product_Interest__c: "Analytics",
      Management_Notes__c: null,
      Solution_Partner_SI__c: null,
      Cloud_Hosting_Commit_Hyperscalers__c: null,
      Data_Warehouse_Provider__c: null,
      Referring_Account_Owner__r: { Name: "Alex Morgan" },
      Initial_Contact__c: null,
      Initial_Contact__r: null,
      Initial_Contact_Role__c: null,
    } satisfies SfdcOpportunityDetail,
  ])
);

// ── Approval history ────────────────────────────────────────────────
const DEMO_APPROVAL_STEPS: SfdcApprovalStep[] = [
  { Id: demoId(201), StepStatus: "Approved", Comments: "Looks good, approved.", CreatedDate: daysAgo(3), Actor: { Name: "Alex Morgan" }, OriginalActor: { Name: "Alex Morgan" } },
];

// ── Billing installments ────────────────────────────────────────────
const DEMO_BILLING_INSTALLMENTS: SfdcBillingInstallment[] = [
  { Id: demoId(301), Name: "Q1-2026 Installment", Installment_Date__c: "2026-03-15", Installments_Total_Amount__c: 75000, Referral_Commission_Amount__c: 7500, Referral_Commission_Payment_Status__c: "Paid" },
  { Id: demoId(302), Name: "Q2-2026 Installment", Installment_Date__c: "2026-06-15", Installments_Total_Amount__c: 75000, Referral_Commission_Amount__c: 7500, Referral_Commission_Payment_Status__c: "Pending" },
];

// ── Public accessors (return the same shape as real SFDC queries) ───
export function getDemoLeads(): SfdcQueryResult<SfdcLead> {
  return { totalSize: DEMO_LEADS.length, done: true, records: DEMO_LEADS };
}

export function getDemoOpportunities(): SfdcQueryResult<SfdcOpportunity> {
  return { totalSize: DEMO_OPPORTUNITIES.length, done: true, records: DEMO_OPPORTUNITIES };
}

export function getDemoLeadDetail(leadId: string): SfdcQueryResult<SfdcLeadDetail> {
  const detail = DEMO_LEAD_DETAILS[leadId];
  if (!detail) return { totalSize: 0, done: true, records: [] };
  return { totalSize: 1, done: true, records: [detail] };
}

export function getDemoOpportunityDetail(oppId: string): SfdcQueryResult<SfdcOpportunityDetail> {
  const detail = DEMO_OPP_DETAILS[oppId];
  if (!detail) return { totalSize: 0, done: true, records: [] };
  return { totalSize: 1, done: true, records: [detail] };
}

export function getDemoApprovalHistory(): SfdcQueryResult<SfdcApprovalStep> {
  return { totalSize: DEMO_APPROVAL_STEPS.length, done: true, records: DEMO_APPROVAL_STEPS };
}

export function getDemoBillingInstallments(): SfdcQueryResult<SfdcBillingInstallment> {
  return { totalSize: DEMO_BILLING_INSTALLMENTS.length, done: true, records: DEMO_BILLING_INSTALLMENTS };
}

export function getDemoUserNames(userIds: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const id of userIds) {
    map.set(id, "Demo User");
  }
  return map;
}
