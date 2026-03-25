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
          // POST /api/sfdc-proxy — proxy SOQL queries using client credentials
          server.middlewares.use("/api/sfdc-proxy", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
            if (req.method !== "POST") { res.writeHead(405); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

            const body = await readBody(req);
            const { query: soql } = body;
            const instanceUrl = env.SFDC_INSTANCE_URL;

            if (!soql || !instanceUrl) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing query or SFDC_INSTANCE_URL" }));
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
