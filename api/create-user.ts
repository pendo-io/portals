import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth, isSuperAdmin } from "./_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify authenticated user is super_admin
  const user = await verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const isAdmin = await isSuperAdmin(user.id);
  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden — super_admin required" });
  }

  const { email, password, fullName, role, partnerId } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Missing email, password, or fullName" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Supabase credentials not configured" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    if (partnerId) {
      await supabase
        .from("profiles")
        .update({ partner_id: partnerId })
        .eq("id", userId);
    }

    if (role === "super_admin") {
      await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "super_admin" });
    }

    return res.status(200).json({ id: userId, email });
  } catch (error: any) {
    console.error("create-user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
