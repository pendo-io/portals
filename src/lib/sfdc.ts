export interface SfdcQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

export async function sfdcQuery<T>(
  query: string
): Promise<SfdcQueryResult<T>> {
  const res = await fetch("/api/sfdc-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  const res = await fetch("/api/sfdc-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sObject, fields }),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = Array.isArray(data) ? data[0]?.message : data.error || `Create failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
