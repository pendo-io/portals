import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Returns the authenticated user or null.
 */
export async function verifyAuth(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user;
}

/**
 * Checks if a user has the super_admin role.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .limit(1);

  return (data?.length ?? 0) > 0;
}
