import type { VercelRequest } from "@vercel/node";

interface Entry {
  count: number;
  resetAt: number;
}

// In-memory store — persists within a warm function instance.
// Provides meaningful protection against rapid abuse on the same instance.
const store = new Map<string, Entry>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export function checkRateLimit(
  ip: string,
  endpoint: string,
  max: number,
  windowMs: number
): RateLimitResult {
  // Probabilistic cleanup to prevent unbounded growth
  if (Math.random() < 0.02) cleanup();

  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

export function getClientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  if (Array.isArray(fwd)) return fwd[0].trim();
  return "unknown";
}
