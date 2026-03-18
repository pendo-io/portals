export interface SfdcQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

export async function sfdcQuery<T>(
  query: string,
  instanceUrl: string,
  accessToken: string
): Promise<SfdcQueryResult<T>> {
  const res = await fetch("/api/sfdc-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, instanceUrl, accessToken }),
  });

  if (res.status === 401) {
    window.dispatchEvent(new Event("sfdc-session-expired"));
    throw new Error("SFDC session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `SFDC query failed (${res.status})`);
  }

  return res.json();
}
