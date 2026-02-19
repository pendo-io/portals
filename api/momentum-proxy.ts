import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const { path, params } = req.body || {};

  if (!path) {
    return res.status(400).json({ error: "Missing path" });
  }

  const apiKey = process.env.MOMENTUM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "MOMENTUM_API_KEY not configured" });
  }

  try {
    const url = new URL(`https://api.momentum.io/v1${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value as string);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
    });

    const body = await response.text();
    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    return res.send(body);
  } catch (error: any) {
    console.error("momentum-proxy error:", error);
    return res.status(500).json({ error: error.message || "Proxy request failed" });
  }
}
