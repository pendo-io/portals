import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const { path, method, body } = req.body || {};

  if (!path) {
    return res.status(400).json({ error: "Missing path" });
  }

  const apiKey = process.env.CLARI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "CLARI_API_KEY not configured" });
  }

  try {
    const url = `https://api.clari.com/v4${path}`;

    const response = await fetch(url, {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const responseBody = await response.text();
    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    return res.send(responseBody);
  } catch (error: any) {
    console.error("clari-proxy error:", error);
    return res.status(500).json({ error: error.message || "Proxy request failed" });
  }
}
