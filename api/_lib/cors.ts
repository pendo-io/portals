export function getAllowedOrigins(): string[] {
  const origins = [process.env.ALLOWED_ORIGIN || "https://pendoportals.vercel.app"];
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:8080");
  }
  return origins;
}

export function setCorsHeaders(res: any, origin: string) {
  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}
