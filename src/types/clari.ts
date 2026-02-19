/** Raw field entry from Clari API response */
export interface ClariRawField {
  id: string;
  value: unknown;
  alias: string | null;
}

/** Raw opportunity from Clari API */
export interface ClariRawOpportunity {
  id: string;
  fields: ClariRawField[];
}

/** Parsed opportunity with typed fields */
export interface ClariOpportunity {
  oppId: string;
  oppName: string;
  clariScore: number | null;
  forecastAmount: number | null;
  crmAmount: number | null;
  riskReason: string | null;
  stageName: string | null;
  forecastCategory: string | null;
  closeDate: string | null;
  ownerName: string | null;
  accountName: string | null;
  type: string | null;
  currentArr: number | null;
  netArr: number | null;
}

export interface ClariAccountSummary {
  accountId: string;
  avgClariScore: number | null;
  totalForecastAmount: number;
  totalCrmAmount: number;
  opportunityCount: number;
  topRisks: string[];
}

export interface ClariForecastEntry {
  timePeriod: string;
  forecastCategory: string;
  amount: number;
  adjustedAmount: number | null;
  ownerName: string | null;
}

export interface ClariForecastExportResult {
  exportId: string;
  status: "queued" | "processing" | "completed" | "failed";
  entries: ClariForecastEntry[];
  createdAt: string;
  completedAt: string | null;
}
