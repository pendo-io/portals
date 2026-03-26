import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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

  const { email, password, fullName, role, partnerId } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Missing email, password, or fullName" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Supabase credentials not configured" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Create auth user with password
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

    // 2. Assign partner if provided
    if (partnerId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ partner_id: partnerId })
        .eq("id", userId);

      if (profileError) {
        console.error("Failed to assign partner:", profileError);
      }
    }

    // 3. Assign super_admin role if requested
    if (role === "super_admin") {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "super_admin" });

      if (roleError) {
        console.error("Failed to assign role:", roleError);
      }
    }

    return res.status(200).json({ id: userId, email });
  } catch (error: any) {
    console.error("create-user error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
