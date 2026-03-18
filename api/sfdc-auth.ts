import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, redirectUri, codeVerifier } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  const clientId = process.env.SFDC_CLIENT_ID;
  const clientSecret = process.env.SFDC_CLIENT_SECRET;
  const loginUrl = process.env.SFDC_LOGIN_URL || "https://login.salesforce.com";

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "SFDC credentials not configured" });
  }

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("SFDC token exchange failed:", err);
      return res.status(400).json({ error: "Failed to exchange authorization code" });
    }

    const tokenData = await tokenResponse.json();

    // 2. Get user identity
    const userInfoResponse = await fetch(
      `${tokenData.instance_url}/services/oauth2/userinfo`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!userInfoResponse.ok) {
      return res.status(400).json({ error: "Failed to fetch Salesforce user info" });
    }

    const userInfo = await userInfoResponse.json();

    return res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      instance_url: tokenData.instance_url,
      issued_at: tokenData.issued_at,
      user_id: userInfo.user_id,
      org_id: userInfo.organization_id,
      email: userInfo.email,
      name: userInfo.name,
    });
  } catch (error: any) {
    console.error("sfdc-auth error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
