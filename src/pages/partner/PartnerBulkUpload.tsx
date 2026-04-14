import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePortalType } from "@/hooks/usePortalType";
import { useAuth } from "@/hooks/useAuth";
import { sfdcCreate } from "@/lib/sfdc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  AlertCircle,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

/* ── CSV template columns → Salesforce field mapping ── */

const TEMPLATE_COLUMNS = [
  "Company",
  "Website",
  "First Name",
  "Last Name",
  "Email",
  "Department(s)",
  "Street",
  "City",
  "State",
  "Zip",
  "Country",
  "Number of Users",
  "Current Tech Stack / Solutions",
  "Use Case",
  "Competitors Considered or Incumbent",
  "Additional Information",
] as const;

const CSV_TO_SFDC: Record<string, string> = {
  "Company": "Company",
  "Website": "Website",
  "First Name": "FirstName",
  "Last Name": "LastName",
  "Email": "Email",
  "Department(s)": "Department_s__c",
  "Street": "Street",
  "City": "City",
  "State": "State",
  "Zip": "PostalCode",
  "Country": "Country",
  "Number of Users": "Number_of_Users__c",
  "Current Tech Stack / Solutions": "Current_Tech_Stack_Solutions__c",
  "Use Case": "Use_Case__c",
  "Competitors Considered or Incumbent": "Competitors_Considered_or_Incumbent__c",
  "Additional Information": "Additional_Information__c",
};

const REQUIRED_COLUMNS = ["Company", "Website", "Last Name", "Email", "Department(s)", "Number of Users", "Current Tech Stack / Solutions", "Use Case"];

const USE_CASE_VALUES = ["Pendo for Customers", "Pendo for Employees"];

type RowStatus = "pending" | "uploading" | "success" | "error";

interface ParsedRow {
  data: Record<string, string>;
  status: RowStatus;
  error?: string;
}

/* ── Humanize Salesforce errors ── */

function humanizeError(msg: string): string {
  if (!msg) return "Upload failed — please check this row and try again.";
  if (msg.includes("DUPLICATES_DETECTED") || msg.includes("already exists"))
    return "A lead with this email already exists in Salesforce.";
  if (msg.includes("INVALID_EMAIL_ADDRESS"))
    return "Invalid email address format.";
  if (msg.includes("STRING_TOO_LONG"))
    return "One or more fields exceed the maximum character limit.";
  if (msg.includes("REQUIRED_FIELD_MISSING"))
    return "A required field is missing — check Company, Last Name, and Email.";
  if (msg.includes("FIELD_CUSTOM_VALIDATION_EXCEPTION"))
    return "This record didn't pass a Salesforce validation rule. Check all fields.";
  if (msg.includes("INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST"))
    return "Use Case must be exactly \"Pendo for Customers\" or \"Pendo for Employees\".";
  if (msg.includes("UNABLE_TO_LOCK_ROW"))
    return "Salesforce was busy — this can be retried.";
  if (msg.includes("SERVER_UNAVAILABLE") || msg.includes("REQUEST_LIMIT_EXCEEDED"))
    return "Salesforce is temporarily unavailable — try again shortly.";
  return msg;
}

/* ── Component ── */

const PartnerBulkUpload = () => {
  useDocumentTitle("Bulk Lead Upload");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, sfdcAccountId, partnerOwnerId } = useAuth();
  const { t } = usePortalType();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validCount = rows.filter((r) => r.status === "pending").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const successCount = rows.filter((r) => r.status === "success").length;

  /* ── Template download ── */

  const downloadTemplate = () => {
    const exampleRow: Record<string, string> = {
      "Company": "Acme Inc",
      "Website": "acme.com",
      "First Name": "Jane",
      "Last Name": "Doe",
      "Email": "jane@acme.com",
      "Department(s)": "Product, Eng",
      "Street": "123 Main St",
      "City": "Raleigh",
      "State": "NC",
      "Zip": "27601",
      "Country": "US",
      "Number of Users": "500",
      "Current Tech Stack / Solutions": "Pendo, Amplitude",
      "Use Case": "Pendo for Customers",
      "Competitors Considered or Incumbent": "WalkMe",
      "Additional Information": "",
    };
    const csv = Papa.unparse({ fields: [...TEMPLATE_COLUMNS], data: [exampleRow] });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lead_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Export failed rows as CSV ── */

  const downloadErrors = () => {
    const failed = rows.filter((r) => r.status === "error");
    if (failed.length === 0) return;
    const data = failed.map((r) => ({ ...r.data, "Error": r.error || "" }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "failed_leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── File parse ── */

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseErrors([]);
    setRows([]);
    setDone(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const errors: string[] = [];

        // Validate headers
        const headers = results.meta.fields ?? [];
        const missing = TEMPLATE_COLUMNS.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          errors.push(`Missing columns: ${missing.join(", ")}`);
        }

        if (results.data.length === 0) {
          errors.push("File contains no data rows");
        }

        if (results.data.length > 200) {
          errors.push("Maximum 200 leads per upload");
        }

        // Validate individual rows
        const parsed: ParsedRow[] = [];
        (results.data as Record<string, string>[]).slice(0, 200).forEach((row, i) => {
          const rowErrors: string[] = [];
          for (const col of REQUIRED_COLUMNS) {
            if (!row[col]?.trim()) {
              rowErrors.push(`${col} is required`);
            }
          }
          if (row["Email"]?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row["Email"].trim())) {
            rowErrors.push("Email must be a valid address (e.g. name@company.com)");
          }
          if (row["Website"]?.trim()) {
            const url = row["Website"].startsWith("http") ? row["Website"] : `https://${row["Website"]}`;
            try {
              if (!new URL(url).hostname.includes(".")) rowErrors.push("Website must be a valid domain (e.g. acme.com)");
            } catch {
              rowErrors.push("Website must be a valid domain (e.g. acme.com)");
            }
          }
          if (row["Use Case"]?.trim() && !USE_CASE_VALUES.includes(row["Use Case"].trim())) {
            rowErrors.push("Use Case must be \"Pendo for Customers\" or \"Pendo for Employees\"");
          }
          if (row["Number of Users"]?.trim() && isNaN(Number(row["Number of Users"].trim()))) {
            rowErrors.push("Number of Users must be a number (e.g. 500)");
          }
          const hasErrors = rowErrors.length > 0;
          parsed.push({
            data: row,
            status: hasErrors ? "error" : "pending",
            error: hasErrors ? rowErrors.join("; ") : undefined,
          });
        });

        setParseErrors(errors.filter((e) => !e.startsWith("Row")));
        setRows(parsed);

        const rowErrs = parsed.filter((r) => r.status === "error").length;
        const headerErrs = errors.filter((e) => !e.startsWith("Row")).length;

        if (headerErrs > 0) {
          toast.error("Template mismatch — check column headers");
        } else if (rowErrs === parsed.length && parsed.length > 0) {
          toast.error("All rows have validation errors — please fix your CSV and re-upload");
        } else if (rowErrs > 0) {
          toast.error(`${rowErrs} row${rowErrs === 1 ? " has" : "s have"} errors — valid rows can still be uploaded`);
        } else if (parsed.length > 0) {
          toast.success(`${parsed.length} lead${parsed.length === 1 ? "" : "s"} ready to upload`);
        }
      },
      error(err) {
        toast.error("Failed to parse CSV file");
        setParseErrors([err.message]);
      },
    });

    e.target.value = "";
  }, []);

  /* ── Upload to Salesforce ── */

  const uploadRows = async (filter: (r: ParsedRow) => boolean) => {
    const indices = rows.map((r, i) => (filter(r) ? i : -1)).filter((i) => i >= 0);
    if (indices.length === 0) {
      toast.error("No rows to upload");
      return;
    }

    setUploading(true);
    setDone(false);

    let ok = 0;
    let fail = 0;

    for (const i of indices) {
      setRows((prev) => prev.map((r, j) => (j === i ? { ...r, status: "uploading" as RowStatus, error: undefined } : r)));

      try {
        const fields: Record<string, unknown> = {
          RecordTypeId: "0125b000000vvJJAAY",
          LeadSource: "Partner Referral",
          Status: "Pending",
        };

        if (sfdcAccountId) fields.Referral_Partner_Account__c = sfdcAccountId;
        if (partnerOwnerId) fields.Partner_Owner__c = partnerOwnerId;

        for (const [csvCol, sfdcField] of Object.entries(CSV_TO_SFDC)) {
          const val = rows[i].data[csvCol]?.trim();
          if (!val) continue;
          if (sfdcField === "Number_of_Users__c") {
            fields[sfdcField] = Number(val);
          } else {
            fields[sfdcField] = val;
          }
        }

        await sfdcCreate("Lead", fields, session?.access_token);
        setRows((prev) => prev.map((r, j) => (j === i ? { ...r, status: "success" as RowStatus } : r)));
        ok++;
      } catch (err: any) {
        setRows((prev) =>
          prev.map((r, j) =>
            j === i ? { ...r, status: "error" as RowStatus, error: humanizeError(err.message) } : r
          )
        );
        fail++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["sfdc-leads"] });
    setUploading(false);
    setDone(true);

    if (fail === 0) {
      toast.success(`All ${ok} lead${ok === 1 ? "" : "s"} uploaded successfully`);
    } else if (ok === 0) {
      toast.error(`All ${fail} lead${fail === 1 ? "" : "s"} failed — see errors below`);
    } else {
      toast.error(`${fail} failed, ${ok} succeeded — see errors below`);
    }
  };

  const handleUpload = () => uploadRows((r) => r.status === "pending");
  const handleRetryFailed = () => uploadRows((r) => r.status === "error");

  const reset = () => {
    setRows([]);
    setParseErrors([]);
    setDone(false);
  };

  /* ── Done state — all success ── */

  if (done && errorCount === 0 && successCount > 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t("Upload Complete")}</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              {t(`Successfully uploaded ${successCount} lead${successCount === 1 ? "" : "s"} to Salesforce.`)}
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={reset}>
              {t("Upload More")}
            </Button>
            <Button onClick={() => navigate("/leads")}>
              {t("View Leads")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main UI ── */

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          /* ── Empty / Upload state ── */
          <div className="p-4 sm:p-8 max-w-3xl mx-auto w-full space-y-6">
            {/* Step 1: Download template */}
            <div className="rounded-lg border p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                <h3 className="font-semibold">{t("Download the template")}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("The template includes an example row. Fill in your leads and remove the example before uploading.")}
              </p>
              <div className="rounded border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground text-[13px]">{t("Field formatting")}</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><span className="font-medium text-foreground">Email</span> — must be a valid email address (e.g. name@company.com)</li>
                  <li><span className="font-medium text-foreground">Website</span> — domain or full URL, max 255 characters (e.g. acme.com)</li>
                  <li><span className="font-medium text-foreground">Use Case</span> — must be exactly <span className="font-mono bg-muted px-1 rounded">Pendo for Customers</span> or <span className="font-mono bg-muted px-1 rounded">Pendo for Employees</span></li>
                  <li><span className="font-medium text-foreground">Number of Users</span> — numeric value only (e.g. 500)</li>
                </ul>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                {t("Download Template")}
              </Button>
            </div>

            {/* Step 2: Upload */}
            <div className="rounded-lg border p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                <h3 className="font-semibold">{t("Upload your file")}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("Select your completed CSV file. Maximum 200 leads per upload.")}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{t("Click to select a CSV file")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("or drag and drop")}</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* ── Preview / Results ── */
          <div className="space-y-0">
            {/* Parse-level errors (missing columns, etc.) */}
            {parseErrors.length > 0 && (
              <div className="mx-3 sm:mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-destructive">Your CSV doesn't match the expected template.</p>
                    {parseErrors.map((e, i) => (
                      <p key={i} className="text-destructive/80">{e}</p>
                    ))}
                    <p className="text-muted-foreground pt-1">Please download the template, update your file, and re-upload.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Post-upload summary banner */}
            {done && errorCount > 0 && (
              <div className="mx-3 sm:mx-6 mt-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-semibold text-sm">
                        {successCount > 0
                          ? `${errorCount} of ${errorCount + successCount} lead${errorCount + successCount === 1 ? "" : "s"} failed to upload`
                          : `All ${errorCount} lead${errorCount === 1 ? "" : "s"} failed to upload`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {successCount > 0
                          ? "Successfully uploaded leads are already in Salesforce. You can retry the failed ones or download them to fix and re-upload."
                          : "No leads were uploaded. You can retry, or download the errors to fix in your spreadsheet and re-upload."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={handleRetryFailed} disabled={uploading} className="gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry {errorCount} Failed
                      </Button>
                      <Button size="sm" variant="ghost" onClick={downloadErrors} className="gap-1.5">
                        <Download className="h-3.5 w-3.5" />
                        Download Failed Rows
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { reset(); fileRef.current?.click(); }} className="gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Re-upload CSV
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary bar */}
            <div className="border-b px-3 sm:px-6 py-3 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{rows.length} total</Badge>
              {validCount > 0 && <Badge variant="outline" className="text-primary border-primary/30">{validCount} ready</Badge>}
              {errorCount > 0 && <Badge variant="outline" className="text-destructive border-destructive/30">{errorCount} error{errorCount !== 1 ? "s" : ""}</Badge>}
              {successCount > 0 && <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">{successCount} uploaded</Badge>}
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto border-b">
              <Table className="w-max min-w-full [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[50px] font-semibold text-xs uppercase tracking-wider sticky left-0 bg-muted/30 z-10">#</TableHead>
                    <TableHead className="w-[80px] font-semibold text-xs uppercase tracking-wider sticky left-[50px] bg-muted/30 z-10">Status</TableHead>
                    {TEMPLATE_COLUMNS.map((col) => (
                      <TableHead key={col} className="min-w-[140px] font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <>
                      <TableRow
                        key={i}
                        className={`h-[52px] ${
                          row.status === "error"
                            ? "bg-destructive/[0.03]"
                            : row.status === "success"
                            ? "bg-emerald-500/[0.03]"
                            : ""
                        }`}
                      >
                        <TableCell className={`py-2 text-sm text-muted-foreground sticky left-0 z-10 ${
                          row.status === "error" ? "bg-destructive/[0.03]" : row.status === "success" ? "bg-emerald-500/[0.03]" : "bg-background"
                        }`}>{i + 1}</TableCell>
                        <TableCell className={`py-2 sticky left-[50px] z-10 ${
                          row.status === "error" ? "bg-destructive/[0.03]" : row.status === "success" ? "bg-emerald-500/[0.03]" : "bg-background"
                        }`}>
                          {row.status === "pending" && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Ready</span>
                          )}
                          {row.status === "uploading" && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          {row.status === "success" && (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs font-medium">Done</span>
                            </span>
                          )}
                          {row.status === "error" && (
                            <span className="inline-flex items-center gap-1 text-destructive">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Failed</span>
                            </span>
                          )}
                        </TableCell>
                        {TEMPLATE_COLUMNS.map((col) => (
                          <TableCell key={col} className="py-2">
                            <span className="text-sm truncate block max-w-[200px]">{row.data[col] || "—"}</span>
                          </TableCell>
                        ))}
                      </TableRow>
                      {/* Inline error detail row */}
                      {row.status === "error" && row.error && (
                        <TableRow key={`${i}-err`} className="bg-destructive/[0.03] hover:bg-destructive/[0.05]">
                          <TableCell className="sticky left-0 z-10 bg-destructive/[0.03]" />
                          <TableCell
                            colSpan={TEMPLATE_COLUMNS.length + 1}
                            className="py-2 pl-2"
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                              <span className="text-xs text-destructive leading-relaxed">{row.error}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 shrink-0 border-t border-border/50">
          <Button variant="ghost" onClick={reset} className="gap-1.5" disabled={uploading}>
            <Trash2 className="h-4 w-4" />
            {t("Clear")}
          </Button>
          <div className="flex items-center gap-3">
            {!done && (
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                {t("Re-upload")}
              </Button>
            )}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            {!done ? (
              <Button
                onClick={handleUpload}
                disabled={uploading || validCount === 0 || parseErrors.length > 0}
                className="gap-1.5 min-w-[160px]"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading
                  ? t(`Uploading... (${successCount + errorCount}/${validCount + successCount + errorCount})`)
                  : t(`Upload ${validCount} Lead${validCount === 1 ? "" : "s"}`)}
              </Button>
            ) : errorCount > 0 ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleRetryFailed} disabled={uploading} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" />
                  {t(`Retry ${errorCount} Failed`)}
                </Button>
                {successCount > 0 && (
                  <Button onClick={() => navigate("/leads")} className="gap-1.5">
                    {t("View Leads")}
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={() => navigate("/leads")} className="gap-1.5">
                {t("View Leads")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerBulkUpload;
