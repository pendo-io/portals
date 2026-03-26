import { supabase } from "./supabase";

export interface SfdcQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

/** Validates a Salesforce ID (15 or 18 alphanumeric chars) */
export function isSafeSfdcId(id: string): boolean {
  return /^[a-zA-Z0-9]{15,18}$/.test(id);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function sfdcQuery<T>(
  query: string
): Promise<SfdcQueryResult<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/sfdc-proxy", {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = Array.isArray(err) ? err.map((e: any) => e.message).join("; ") : err.message || err.error || JSON.stringify(err);
    console.error("[SFDC Query Error]", detail, "\nQuery:", query);
    throw new Error(detail || `SFDC query failed (${res.status})`);
  }

  return res.json();
}

export async function sfdcCreate(
  sObject: string,
  fields: Record<string, unknown>
): Promise<{ id: string; success: boolean; errors: string[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/sfdc-create", {
    method: "POST",
    headers,
    body: JSON.stringify({ sObject, fields }),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = Array.isArray(data) ? data[0]?.message : data.error || `Create failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
