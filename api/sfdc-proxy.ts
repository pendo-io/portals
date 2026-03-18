import type { VercelRequest, VercelResponse } from "@vercel/node";

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

  const { query, instanceUrl, accessToken } = req.body;

  if (!query || !instanceUrl || !accessToken) {
    return res.status(400).json({ error: "Missing query, instanceUrl, or accessToken" });
  }

  try {
    const sfdcRes = await fetch(
      `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const body = await sfdcRes.text();
    return res.status(sfdcRes.status).setHeader("Content-Type", "application/json").send(body);
  } catch (error: any) {
    console.error("sfdc-proxy error:", error);
    return res.status(500).json({ error: error.message });
  }
}
