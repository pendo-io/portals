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

  const { token, instanceUrl, path } = req.body;

  if (!token || !instanceUrl || !path) {
    return res.status(400).json({ error: "Missing token, instanceUrl, or path" });
  }

  try {
    const response = await fetch(`${instanceUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const body = await response.text();

    // Forward the status code and body
    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    return res.send(body);
  } catch (error: any) {
    console.error("sfdc-proxy error:", error);
    return res.status(500).json({ error: error.message || "Proxy request failed" });
  }
}
