export interface SfdcQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

/** Validates a Salesforce ID (15 or 18 alphanumeric chars) */
export function isSafeSfdcId(id: string): boolean {
  return /^[a-zA-Z0-9]{15,18}$/.test(id);
}

export type SfdcQueryType =
  | "leads"
  | "lead-detail"
  | "opportunities"
  | "opportunity-detail"
  | "approval-history"
  | "billing-installments"
  | "user-names";

interface SfdcQueryOptions {
  accessToken?: string;
  impersonateAccountId?: string;
}

function buildHeaders(opts: SfdcQueryOptions): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.accessToken) {
    headers["Authorization"] = `Bearer ${opts.accessToken}`;
  }
  if (opts.impersonateAccountId) {
    headers["X-Impersonate-Account"] = opts.impersonateAccountId;
  }
  return headers;
}

export async function sfdcQuery<T>(
  type: SfdcQueryType,
  params: Record<string, unknown>,
  opts: SfdcQueryOptions = {}
): Promise<SfdcQueryResult<T>> {
  const headers = buildHeaders(opts);
  const res = await fetch("/api/sfdc-proxy", {
    method: "POST",
    headers,
    body: JSON.stringify({ type, params }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = Array.isArray(err) ? err.map((e: any) => e.message).join("; ") : err.message || err.error || JSON.stringify(err);
    console.error("[SFDC Query Error]", detail, "\nType:", type, "Params:", params);
    throw new Error(detail || `SFDC query failed (${res.status})`);
  }

  return res.json();
}

export async function sfdcCreate(
  sObject: string,
  fields: Record<string, unknown>,
  accessToken?: string
): Promise<{ id: string; success: boolean; errors: string[] }> {
  const headers = buildHeaders({ accessToken });
  const res = await fetch("/api/sfdc-create", {
    method: "POST",
    headers,
    body: JSON.stringify({ sObject, fields }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (Array.isArray(data) && data[0]?.errorCode === "DUPLICATES_DETECTED") {
      throw new Error("A lead with this email already exists in Salesforce. Please use a different email address.");
    }
    const msg = Array.isArray(data) ? data[0]?.message : data.error || `Create failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
