import type {
  ClariOpportunity,
  ClariAccountSummary,
  ClariRawOpportunity,
  ClariRawField,
  ClariForecastExportResult,
} from "@/types/clari";

async function clariFetch<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch("/api/clari-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      method: options?.method,
      body: options?.body,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Clari API error ${res.status}: ${errorBody}`);
  }

  return res.json();
}

function getField(fields: ClariRawField[], id: string): unknown {
  return fields.find((f) => f.id === id)?.value ?? null;
}

function parseOpportunity(raw: ClariRawOpportunity): ClariOpportunity {
  const { fields } = raw;
  const closeRaw = getField(fields, "closedate");

  return {
    oppId: raw.id,
    oppName: (getField(fields, "name") as string) || raw.id,
    clariScore: (getField(fields, "clari.score") as number) ?? null,
    forecastAmount: (getField(fields, "forecasted_arr__c") as number) ?? null,
    crmAmount: (getField(fields, "amount") as number) ?? null,
    riskReason: (getField(fields, "cre_risk_reason__c") as string) ?? null,
    stageName: (getField(fields, "stagename") as string) ?? null,
    forecastCategory: (getField(fields, "sales_forecast_category__c") as string) ?? null,
    closeDate:
      typeof closeRaw === "number"
        ? new Date(closeRaw).toISOString()
        : (closeRaw as string) ?? null,
    ownerName: (getField(fields, "owner.name") as string) ?? null,
    accountName: (getField(fields, "account.name") as string) ?? null,
    type: (getField(fields, "type") as string) ?? null,
    currentArr: (getField(fields, "current_arr__c") as number) ?? null,
    netArr: (getField(fields, "net_arr__c") as number) ?? null,
  };
}

const BATCH_SIZE = 100;

export async function fetchClariOpportunities(
  oppIds: string[]
): Promise<ClariOpportunity[]> {
  if (oppIds.length === 0) return [];

  const batches: string[][] = [];
  for (let i = 0; i < oppIds.length; i += BATCH_SIZE) {
    batches.push(oppIds.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map((batch) => {
      const params = batch.map((id) => `oppId=${encodeURIComponent(id)}`).join("&");
      return clariFetch<{ opportunities: ClariRawOpportunity[] }>(
        `/opportunity?${params}`
      );
    })
  );

  return results
    .flatMap((r) => r.opportunities ?? [])
    .map(parseOpportunity);
}

export async function queueForecastExport(): Promise<{ exportId: string }> {
  return clariFetch<{ exportId: string }>("/forecast/export", {
    method: "POST",
    body: { format: "json" },
  });
}

export async function checkExportStatus(
  exportId: string
): Promise<{ status: string }> {
  return clariFetch<{ status: string }>(`/forecast/export/${exportId}`);
}

export async function getExportResults(
  exportId: string
): Promise<ClariForecastExportResult> {
  return clariFetch<ClariForecastExportResult>(
    `/forecast/export/${exportId}/results`
  );
}

export function aggregateAccountSummary(
  accountId: string,
  opportunities: ClariOpportunity[]
): ClariAccountSummary {
  const scores = opportunities
    .map((o) => o.clariScore)
    .filter((s): s is number => s != null);

  const avgClariScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  const totalForecastAmount = opportunities.reduce(
    (sum, o) => sum + (o.forecastAmount || 0),
    0
  );

  const totalCrmAmount = opportunities.reduce(
    (sum, o) => sum + (o.crmAmount || 0),
    0
  );

  const risks = opportunities
    .map((o) => o.riskReason)
    .filter((r): r is string => r != null);
  const riskCounts = new Map<string, number>();
  for (const risk of risks) {
    riskCounts.set(risk, (riskCounts.get(risk) || 0) + 1);
  }
  const topRisks = [...riskCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([risk]) => risk);

  return {
    accountId,
    avgClariScore,
    totalForecastAmount,
    totalCrmAmount,
    opportunityCount: opportunities.length,
    topRisks,
  };
}
