import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSfdcToken, clearSfdcTokenCache } from "./_lib/sfdc-auth";
import { verifyAuth } from "./_lib/auth";
import { setCorsHeaders } from "./_lib/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin || "");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });

  const instanceUrl = process.env.SFDC_INSTANCE_URL;
  if (!instanceUrl) return res.status(500).json({ error: "SFDC_INSTANCE_URL not configured" });

  const [user, accessToken] = await Promise.all([verifyAuth(req), getSfdcToken()]);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const sfdcRes = await fetch(
      `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (sfdcRes.status === 401) {
      clearSfdcTokenCache();
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
