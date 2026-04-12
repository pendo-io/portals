import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const _rlStore = new Map<string, { count: number; resetAt: number }>();
function _rl(req: VercelRequest, key: string, max: number, windowMs: number) {
  const fwd = req.headers["x-forwarded-for"];
  const ip = (typeof fwd === "string" ? fwd.split(",")[0] : Array.isArray(fwd) ? fwd[0] : "unknown").trim();
  const k = `${ip}:${key}`;
  const now = Date.now();
  const e = _rlStore.get(k);
  if (!e || now > e.resetAt) { _rlStore.set(k, { count: 1, resetAt: now + windowMs }); return null; }
  if (e.count >= max) return Math.ceil((e.resetAt - now) / 1000);
  e.count++;
  return null;
}

async function verifyAdmin(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .limit(1);

  if (!roles?.length) return null;
  return user;
}

function getAllowedOrigins(): string[] {
  const origins = [process.env.ALLOWED_ORIGIN || "https://pendoportals.vercel.app"];
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:8080");
  }
  return origins;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || "";
  if (getAllowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const retryAfter = _rl(req, "create-user", 20, 5 * 60 * 1000);
  if (retryAfter !== null) {
    return res.status(429).setHeader("Retry-After", String(retryAfter)).json({ error: "Too many requests" });
  }

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: "Forbidden" });

  const { email, password, fullName, role, partnerId } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Missing email, password, or fullName" });
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  if (typeof fullName !== "string" || fullName.trim().length === 0 || fullName.length > 255) {
    return res.status(400).json({ error: "fullName must be 1–255 characters" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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
      return res.status(400).json({ error: "Failed to create user" });
    }

    const userId = authData.user.id;

    if (partnerId) {
      await supabase.from("profiles").update({ partner_id: partnerId }).eq("id", userId);
    }

    if (role === "super_admin") {
      await supabase.from("user_roles").insert({ user_id: userId, role: "super_admin" });
    }

    return res.status(200).json({ id: userId, email });
  } catch (error: any) {
    console.error("create-user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
