import type { VercelRequest, VercelResponse } from "@vercel/node";

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
    const err = await res.text();
    console.error("SFDC client_credentials token failed:", err);
    throw new Error("Failed to obtain SFDC access token");
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + 55 * 60 * 1000, // refresh 5 min before 1hr expiry
  };

  return data.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  const instanceUrl = process.env.SFDC_INSTANCE_URL;
  if (!instanceUrl) {
    return res.status(500).json({ error: "SFDC_INSTANCE_URL not configured" });
  }

  try {
    const accessToken = await getSfdcToken();
    const sfdcRes = await fetch(
      `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (sfdcRes.status === 401) {
      // Token expired, clear cache and retry once
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
    return res.status(500).json({ error: error.message });
  }
}
