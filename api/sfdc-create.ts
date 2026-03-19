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

  const { sObject, fields, instanceUrl, accessToken } = req.body;

  if (!sObject || !fields || !instanceUrl || !accessToken) {
    return res.status(400).json({ error: "Missing sObject, fields, instanceUrl, or accessToken" });
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

    const body = await sfdcRes.text();
    return res.status(sfdcRes.status).setHeader("Content-Type", "application/json").send(body);
  } catch (error: any) {
    console.error("sfdc-create error:", error);
    return res.status(500).json({ error: error.message });
  }
}
