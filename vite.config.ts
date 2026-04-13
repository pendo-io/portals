import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  let cachedToken: { access_token: string; expires_at: number } | null = null;

  async function getSfdcToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expires_at) {
      return cachedToken.access_token;
    }

    const clientId = env.SFDC_CLIENT_ID;
    const clientSecret = env.SFDC_CLIENT_SECRET;
    const loginUrl = env.SFDC_LOGIN_URL || "https://login.salesforce.com";

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
      const err = await res.text();
      console.error("SFDC client_credentials token failed:", err);
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

  const LEAD_LIST_FIELDS = `Id, Name, FirstName, LastName, Company, Email, Status, LeadSource, CreatedDate`;
  const LEAD_DETAIL_FIELDS = `Id, Name, FirstName, LastName, Company, Email, Website, Status, LeadSource, CreatedDate, Owner.Name, CreatedBy.Name, Street, City, State, PostalCode, Country, Referral_Partner_Account__c, Referral_Partner_Account__r.Name, Number_of_Users__c, Current_Tech_Stack_Solutions__c, Department_s__c, Use_Case__c, Competitors_Considered_or_Incumbent__c, Additional_Information__c`;
  const OPP_LIST_FIELDS = `Id, Name, Account.Name, StageName, Amount, CloseDate, LeadSource, CreatedDate`;
  const OPP_DETAIL_FIELDS = `Id, Name, Account.Name, Owner.Name, CreatedBy.Name, StageName, Amount, CloseDate, Probability, LeadSource, Type, CreatedDate, ARR__c, ARR_USD__c, Net_ARR__c, TCV_USD__c, Expiration_Date__c, Transaction_Type__c, Next_Steps__c, Pipeline_Date__c, Primary_Competitor_Names__c, Partner_Relationship__c, Partner_Sub_type__c, Created_By_Role__c, Net_ARR_Percentage__c, Initial_Product_Interest__c, Management_Notes__c, Solution_Partner_SI__c, Cloud_Hosting_Commit_Hyperscalers__c, Data_Warehouse_Provider__c, Referring_Account_Owner__r.Name, Initial_Contact__c, Initial_Contact__r.Name, Initial_Contact_Role__c`;
  const BI_FIELDS = `Id, Name, Installment_Date__c, Installments_Total_Amount__c`;

  function buildDevQuery(type: string, params: any): string {
    switch (type) {
      case "leads":
        return `SELECT ${LEAD_LIST_FIELDS} FROM Lead WHERE LeadSource = 'Partner Referral' ORDER BY CreatedDate DESC`;
      case "lead-detail": {
        if (!params?.leadId || !isSafeSfdcId(params.leadId)) throw new Error("Invalid leadId");
        return `SELECT ${LEAD_DETAIL_FIELDS} FROM Lead WHERE Id = '${params.leadId}' LIMIT 1`;
      }
      case "opportunities":
        return `SELECT ${OPP_LIST_FIELDS} FROM Opportunity WHERE LeadSource = 'Partner Referral' ORDER BY CloseDate DESC`;
      case "opportunity-detail": {
        if (!params?.oppId || !isSafeSfdcId(params.oppId)) throw new Error("Invalid oppId");
        return `SELECT ${OPP_DETAIL_FIELDS} FROM Opportunity WHERE Id = '${params.oppId}' LIMIT 1`;
      }
      case "approval-history": {
        if (!params?.targetObjectId || !isSafeSfdcId(params.targetObjectId)) throw new Error("Invalid targetObjectId");
        return `SELECT Id, StepStatus, Comments, CreatedDate, Actor.Name, OriginalActor.Name FROM ProcessInstanceStep WHERE ProcessInstance.TargetObjectId = '${params.targetObjectId}' ORDER BY CreatedDate DESC`;
      }
      case "billing-installments": {
        if (!params?.oppId || !isSafeSfdcId(params.oppId)) throw new Error("Invalid oppId");
        return `SELECT ${BI_FIELDS} FROM Billing_Installment__c WHERE Quote__r.SBQQ__Opportunity2__c = '${params.oppId}' AND Quote__r.SBQQ__Primary__c = true ORDER BY Installment_Date__c ASC`;
      }
      case "user-names": {
        if (!Array.isArray(params?.userIds) || params.userIds.length === 0) throw new Error("Invalid userIds");
        const safeIds = params.userIds.filter(isSafeSfdcId).slice(0, 200);
        if (safeIds.length === 0) throw new Error("No valid userIds");
        return `SELECT Id, Name FROM User WHERE Id IN (${safeIds.map((id: string) => `'${id}'`).join(",")})`;
      }
      default:
        throw new Error(`Unknown query type: ${type}`);
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      {
        name: "sfdc-api",
        configureServer(server) {
          // POST /api/sfdc-proxy — typed query proxy
          server.middlewares.use("/api/sfdc-proxy", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
            if (req.method !== "POST") { res.writeHead(405); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

            const body = await readBody(req);
            const { type, params = {} } = body;
            const instanceUrl = env.SFDC_INSTANCE_URL;

            if (!type || !instanceUrl) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing type or SFDC_INSTANCE_URL" }));
              return;
            }

            let soql: string;
            try {
              soql = buildDevQuery(type, params);
            } catch (err: any) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message }));
              return;
            }

            try {
              const accessToken = await getSfdcToken();
              const sfdcRes = await fetch(
                `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );

              if (sfdcRes.status === 401) {
                cachedToken = null;
                const newToken = await getSfdcToken();
                const retryRes = await fetch(
                  `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`,
                  { headers: { Authorization: `Bearer ${newToken}` } }
                );
                const responseBody = await retryRes.text();
                res.writeHead(retryRes.status, { "Content-Type": "application/json" });
                res.end(responseBody);
                return;
              }

              const responseBody = await sfdcRes.text();
              res.writeHead(sfdcRes.status, { "Content-Type": "application/json" });
              res.end(responseBody);
            } catch (error: any) {
              console.error("sfdc-proxy error:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: error.message }));
            }
          });

          // POST /api/sfdc-create — create an sObject record
          server.middlewares.use("/api/sfdc-create", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
            if (req.method !== "POST") { res.writeHead(405); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

            const body = await readBody(req);
            const { sObject, fields } = body;
            const instanceUrl = env.SFDC_INSTANCE_URL;

            if (!sObject || !fields || !instanceUrl) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing sObject, fields, or SFDC_INSTANCE_URL" }));
              return;
            }

            try {
              const accessToken = await getSfdcToken();
              const sfdcRes = await fetch(
                `${instanceUrl}/services/data/v62.0/sobjects/${sObject}/`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    "Sforce-Duplicate-Rule-Header": "allowSave=true",
                  },
                  body: JSON.stringify(fields),
                }
              );

              const responseBody = await sfdcRes.text();
              res.writeHead(sfdcRes.status, { "Content-Type": "application/json" });
              res.end(responseBody);
            } catch (error: any) {
              console.error("sfdc-create error:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: error.message }));
            }
          });

          // DELETE /api/delete-user — delete a user (requires service role)
          server.middlewares.use("/api/delete-user", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
            if (req.method !== "DELETE") { res.writeHead(405); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

            const body = await readBody(req);
            const { userId } = body;

            if (!userId) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing userId" }));
              return;
            }

            const supabaseUrl = env.VITE_SUPABASE_URL;
            const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !serviceRoleKey) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Supabase credentials not configured" }));
              return;
            }

            try {
              const { createClient } = await import("@supabase/supabase-js");
              const supabase = createClient(supabaseUrl, serviceRoleKey);

              const { error } = await supabase.auth.admin.deleteUser(userId);

              if (error) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: error.message }));
                return;
              }

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true }));
            } catch (error: any) {
              console.error("delete-user error:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: error.message }));
            }
          });

          // POST /api/create-user — invite a new user (requires service role)
          server.middlewares.use("/api/create-user", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
            if (req.method !== "POST") { res.writeHead(405); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

            const body = await readBody(req);
            const { email, fullName, role, partnerId } = body;

            if (!email || !fullName) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing email or fullName" }));
              return;
            }

            const supabaseUrl = env.VITE_SUPABASE_URL;
            const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !serviceRoleKey) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Supabase credentials not configured" }));
              return;
            }

            try {
              const { createClient } = await import("@supabase/supabase-js");
              const supabase = createClient(supabaseUrl, serviceRoleKey);

              const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
                data: { full_name: fullName },
                redirectTo: "http://localhost:8080/accept-invite",
              });

              if (authError) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: authError.message }));
                return;
              }

              const userId = authData.user.id;

              const profileUpdate: Record<string, string> = { full_name: fullName };
              if (partnerId) profileUpdate.partner_id = partnerId;
              await supabase.from("profiles").update(profileUpdate).eq("id", userId);

              if (role === "super_admin") {
                await supabase.from("user_roles").insert({ user_id: userId, role: "super_admin" });
              }

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ id: userId, email }));
            } catch (error: any) {
              console.error("create-user error:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

function readBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: string) => { data += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}
