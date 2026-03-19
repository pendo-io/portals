import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      {
        name: "sfdc-auth-api",
        configureServer(server) {
          // POST /api/sfdc-auth — exchange authorization code for tokens
          server.middlewares.use("/api/sfdc-auth", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
            if (req.method !== "POST") { res.writeHead(405); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

            const body = await readBody(req);
            const { code, redirectUri, codeVerifier } = body;

            const clientId = env.SFDC_CLIENT_ID;
            const clientSecret = env.SFDC_CLIENT_SECRET;
            const loginUrl = env.SFDC_LOGIN_URL || "https://login.salesforce.com";

            if (!clientId || !clientSecret) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "SFDC credentials not configured in .env" }));
              return;
            }

            try {
              const tokenParams: Record<string, string> = {
                grant_type: "authorization_code",
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
              };
              if (codeVerifier) {
                tokenParams.code_verifier = codeVerifier;
              }

              const tokenRes = await fetch(`${loginUrl}/services/oauth2/token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(tokenParams),
              });

              if (!tokenRes.ok) {
                const err = await tokenRes.text();
                console.error("SFDC token exchange failed:", err);
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to exchange authorization code", details: err }));
                return;
              }

              const tokenData = await tokenRes.json();

              const userInfoRes = await fetch(`${tokenData.instance_url}/services/oauth2/userinfo`, {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
              });

              if (!userInfoRes.ok) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to fetch user info" }));
                return;
              }

              const userInfo = await userInfoRes.json();

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                instance_url: tokenData.instance_url,
                issued_at: tokenData.issued_at,
                user_id: userInfo.user_id,
                org_id: userInfo.organization_id,
                email: userInfo.email,
                name: userInfo.name,
              }));
            } catch (error: any) {
              console.error("sfdc-auth error:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: error.message }));
            }
          });

          // POST /api/sfdc-refresh — refresh access token
          server.middlewares.use("/api/sfdc-refresh", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
            if (req.method !== "POST") { res.writeHead(405); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

            const body = await readBody(req);
            const { refresh_token } = body;

            const clientId = env.SFDC_CLIENT_ID;
            const clientSecret = env.SFDC_CLIENT_SECRET;
            const loginUrl = env.SFDC_LOGIN_URL || "https://login.salesforce.com";

            if (!clientId || !clientSecret) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "SFDC credentials not configured" }));
              return;
            }

            try {
              const response = await fetch(`${loginUrl}/services/oauth2/token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  grant_type: "refresh_token",
                  refresh_token,
                  client_id: clientId,
                  client_secret: clientSecret,
                }),
              });

              if (!response.ok) {
                const err = await response.text();
                console.error("SFDC refresh failed:", err);
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to refresh token" }));
                return;
              }

              const data = await response.json();
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(data));
            } catch (error: any) {
              console.error("sfdc-refresh error:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          // POST /api/sfdc-create — create an sObject record in Salesforce
          server.middlewares.use("/api/sfdc-create", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
            if (req.method !== "POST") { res.writeHead(405); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

            const body = await readBody(req);
            const { sObject, fields, instanceUrl, accessToken } = body;

            if (!sObject || !fields || !instanceUrl || !accessToken) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing sObject, fields, instanceUrl, or accessToken" }));
              return;
            }

            try {
              const sfdcRes = await fetch(
                `${instanceUrl}/services/data/v62.0/sobjects/${sObject}/`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
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

          // POST /api/sfdc-proxy — proxy SOQL queries to Salesforce
          server.middlewares.use("/api/sfdc-proxy", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
            if (req.method !== "POST") { res.writeHead(405); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

            const body = await readBody(req);
            const { query: soql, instanceUrl, accessToken } = body;

            if (!soql || !instanceUrl || !accessToken) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing query, instanceUrl, or accessToken" }));
              return;
            }

            try {
              const sfdcRes = await fetch(
                `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );

              const responseBody = await sfdcRes.text();
              res.writeHead(sfdcRes.status, { "Content-Type": "application/json" });
              res.end(responseBody);
            } catch (error: any) {
              console.error("sfdc-proxy error:", error);
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
