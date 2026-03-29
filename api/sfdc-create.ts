import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSfdcToken } from "./_lib/sfdc-auth";
import { verifyAuth } from "./_lib/auth";
import { setCorsHeaders } from "./_lib/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin || "");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { sObject, fields } = req.body;
  if (!sObject || !fields) return res.status(400).json({ error: "Missing sObject or fields" });

  const instanceUrl = process.env.SFDC_INSTANCE_URL;
  if (!instanceUrl) return res.status(500).json({ error: "SFDC_INSTANCE_URL not configured" });

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

    const body = await sfdcRes.text();
    return res.status(sfdcRes.status).setHeader("Content-Type", "application/json").send(body);
  } catch (error: any) {
    console.error("sfdc-create error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
