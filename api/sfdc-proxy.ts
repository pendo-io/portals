import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getSfdcToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const clientId = process.env.SFDC_CLIENT_ID;
  const clientSecret = process.env.SFDC_CLIENT_SECRET;
  const loginUrl = process.env.SFDC_LOGIN_URL || "https://login.salesforce.com";

  if (!clientId || !clientSecret) {
    throw new Error("SFDC credentials not configured");
  }

  const res = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to obtain SFDC access token");
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + 55 * 60 * 1000,
  };

  return data.access_token;
}

function isSafeSfdcId(id: string): boolean {
  return /^[a-zA-Z0-9]{15,18}$/.test(id);
}

interface AuthContext {
  userId: string;
  sfdcAccountId: string | null;
  isSuperAdmin: boolean;
}

async function verifyAuthAndGetContext(req: VercelRequest): Promise<AuthContext | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;

  const [profileRes, rolesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("partners(sfdc_account_id)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .limit(1),
  ]);

  const partner = (profileRes.data as any)?.partners;
  const sfdcAccountId = partner?.sfdc_account_id ?? null;
  const isSuperAdmin = (rolesRes.data?.length ?? 0) > 0;

  return { userId: user.id, sfdcAccountId, isSuperAdmin };
}

function getAllowedOrigins(): string[] {
  const origins = [process.env.ALLOWED_ORIGIN || "https://pendoportals.vercel.app"];
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:8080");
  }
  return origins;
}

// ── Query builders ──

const LEAD_LIST_FIELDS = `Id, Name, FirstName, LastName, Company, Email, Website, Status, LeadSource, CreatedDate`;

const LEAD_DETAIL_FIELDS = `Id, Name, FirstName, LastName, Company, Email, Website,
                Status, LeadSource, CreatedDate,
                Owner.Name, CreatedBy.Name,
                Street, City, State, PostalCode, Country,
                Referral_Partner_Account__c, Referral_Partner_Account__r.Name,
                Number_of_Users__c,
                Current_Tech_Stack_Solutions__c, Department_s__c,
                Use_Case__c, Competitors_Considered_or_Incumbent__c,
                Additional_Information__c`;

const OPP_LIST_FIELDS = `Id, Name, Account.Name, Account.Website, StageName, Amount, CloseDate, LeadSource, CreatedDate`;

const OPP_DETAIL_FIELDS = `Id, Name, Account.Name, Account.Website, Owner.Name, CreatedBy.Name,
                StageName, Amount, CloseDate, Probability, LeadSource, Type, CreatedDate,
                ARR__c, ARR_USD__c, Net_ARR__c, TCV_USD__c,
                Expiration_Date__c, Transaction_Type__c,
                Next_Steps__c, Pipeline_Date__c,
                Primary_Competitor_Names__c,
                Partner_Relationship__c, Partner_Sub_type__c,
                Created_By_Role__c, Net_ARR_Percentage__c,
                Initial_Product_Interest__c, Management_Notes__c,
                Solution_Partner_SI__c, Cloud_Hosting_Commit_Hyperscalers__c,
                Data_Warehouse_Provider__c, Referring_Account_Owner__r.Name,
                Initial_Contact__c, Initial_Contact__r.Name, Initial_Contact_Role__c`;

const BI_FIELDS = `Id, Name, Installment_Date__c, Installments_Total_Amount__c`;

type QueryType = "leads" | "lead-detail" | "opportunities" | "opportunity-detail"
  | "approval-history" | "billing-installments" | "user-names";

function buildQuery(type: QueryType, params: any, ctx: AuthContext): string {
  const scoped = !ctx.isSuperAdmin;
  const accountId = ctx.sfdcAccountId;

  switch (type) {
    case "leads": {
      const where = scoped && accountId
        ? `WHERE Referral_Partner_Account__c = '${accountId}'`
        : `WHERE LeadSource = 'Partner Referral'`;
      return `SELECT ${LEAD_LIST_FIELDS} FROM Lead ${where} ORDER BY CreatedDate DESC`;
    }

    case "lead-detail": {
      const { leadId } = params;
      if (!leadId || !isSafeSfdcId(leadId)) throw new Error("Invalid leadId");
      const scopeClause = scoped && accountId
        ? ` AND Referral_Partner_Account__c = '${accountId}'`
        : "";
      return `SELECT ${LEAD_DETAIL_FIELDS} FROM Lead WHERE Id = '${leadId}'${scopeClause} LIMIT 1`;
    }

    case "opportunities": {
      const where = scoped && accountId
        ? `WHERE PartnerAccountId = '${accountId}'`
        : `WHERE LeadSource = 'Partner Referral'`;
      return `SELECT ${OPP_LIST_FIELDS} FROM Opportunity ${where} ORDER BY CloseDate DESC`;
    }

    case "opportunity-detail": {
      const { oppId } = params;
      if (!oppId || !isSafeSfdcId(oppId)) throw new Error("Invalid oppId");
      const scopeClause = scoped && accountId
        ? ` AND PartnerAccountId = '${accountId}'`
        : "";
      return `SELECT ${OPP_DETAIL_FIELDS} FROM Opportunity WHERE Id = '${oppId}'${scopeClause} LIMIT 1`;
    }

    case "approval-history": {
      const { targetObjectId } = params;
      if (!targetObjectId || !isSafeSfdcId(targetObjectId)) throw new Error("Invalid targetObjectId");
      return `SELECT Id, StepStatus, Comments, CreatedDate, Actor.Name, OriginalActor.Name FROM ProcessInstanceStep WHERE ProcessInstance.TargetObjectId = '${targetObjectId}' ORDER BY CreatedDate DESC`;
    }

    case "billing-installments": {
      const { oppId } = params;
      if (!oppId || !isSafeSfdcId(oppId)) throw new Error("Invalid oppId");
      return `SELECT ${BI_FIELDS} FROM Billing_Installment__c WHERE Quote__r.SBQQ__Opportunity2__c = '${oppId}' AND Quote__r.SBQQ__Primary__c = true ORDER BY Installment_Date__c ASC`;
    }

    case "user-names": {
      const { userIds } = params;
      if (!Array.isArray(userIds) || userIds.length === 0) throw new Error("Invalid userIds");
      const safeIds = userIds.filter(isSafeSfdcId).slice(0, 200);
      if (safeIds.length === 0) throw new Error("No valid userIds");
      const inClause = safeIds.map((id: string) => `'${id}'`).join(",");
      return `SELECT Id, Name FROM User WHERE Id IN (${inClause})`;
    }

    default:
      throw new Error(`Unknown query type: ${type}`);
  }
}

// ── Handler ──

const VALID_TYPES: QueryType[] = [
  "leads", "lead-detail", "opportunities", "opportunity-detail",
  "approval-history", "billing-installments", "user-names",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || "";
  if (getAllowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-impersonate-account");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, params = {} } = req.body;
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid query type. Must be one of: ${VALID_TYPES.join(", ")}` });
  }

  const instanceUrl = process.env.SFDC_INSTANCE_URL;
  if (!instanceUrl) return res.status(500).json({ error: "SFDC_INSTANCE_URL not configured" });

  const [authCtx, accessToken] = await Promise.all([
    verifyAuthAndGetContext(req),
    getSfdcToken(),
  ]);
  if (!authCtx) return res.status(401).json({ error: "Unauthorized" });

  // Handle impersonation: super_admin can scope to a different account
  const impersonateAccount = req.headers["x-impersonate-account"] as string | undefined;
  if (impersonateAccount) {
    if (!authCtx.isSuperAdmin) {
      return res.status(403).json({ error: "Only admins can impersonate" });
    }
    if (!isSafeSfdcId(impersonateAccount)) {
      return res.status(400).json({ error: "Invalid impersonate account ID" });
    }
    authCtx.sfdcAccountId = impersonateAccount;
    authCtx.isSuperAdmin = false; // Treat as scoped user
  }

  let query: string;
  try {
    query = buildQuery(type, params, authCtx);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const sfdcRes = await fetch(
      `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (sfdcRes.status === 401) {
      cachedToken = null;
      const newToken = await getSfdcToken();
      const retryRes = await fetch(
        `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${newToken}` } }
      );
      const body = await retryRes.text();
      return res.status(retryRes.status).setHeader("Content-Type", "application/json").send(body);
    }

    const body = await sfdcRes.text();
    return res.status(sfdcRes.status).setHeader("Content-Type", "application/json").send(body);
  } catch (error: any) {
    console.error("sfdc-proxy error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
