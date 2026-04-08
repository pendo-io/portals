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

type RowStatus = "pending" | "uploading" | "success" | "error";

interface ParsedRow {
  data: Record<string, string>;
  status: RowStatus;
  error?: string;
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

  /* ── Template download ── */

  const downloadTemplate = () => {
    const csv = Papa.unparse({ fields: [...TEMPLATE_COLUMNS], data: [] });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lead_upload_template.csv";
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
              rowErrors.push(col);
            }
          }
          if (row["Email"]?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row["Email"].trim())) {
            rowErrors.push("Email (invalid format)");
          }
          if (row["Website"]?.trim()) {
            const url = row["Website"].startsWith("http") ? row["Website"] : `https://${row["Website"]}`;
            try {
              if (!new URL(url).hostname.includes(".")) rowErrors.push("Website (invalid)");
            } catch {
              rowErrors.push("Website (invalid)");
            }
          }
          if (rowErrors.length > 0) {
            errors.push(`Row ${i + 1}: missing or invalid — ${rowErrors.join(", ")}`);
          }
          parsed.push({ data: row, status: rowErrors.length > 0 ? "error" : "pending", error: rowErrors.length > 0 ? rowErrors.join(", ") : undefined });
        });

        setParseErrors(errors.filter((e) => !e.startsWith("Row")));
        setRows(parsed);

        if (errors.length === 0) {
          toast.success(`${parsed.length} lead${parsed.length === 1 ? "" : "s"} ready to upload`);
        } else {
          const rowErrs = parsed.filter((r) => r.status === "error").length;
          const headerErrs = errors.filter((e) => !e.startsWith("Row")).length;
          if (headerErrs > 0) {
            toast.error("Template mismatch — check column headers");
          } else if (rowErrs > 0) {
            toast.error(`${rowErrs} row${rowErrs === 1 ? " has" : "s have"} validation errors`);
          }
        }
      },
      error(err) {
        toast.error("Failed to parse CSV file");
        setParseErrors([err.message]);
      },
    });

    // Reset file input so same file can be re-selected
    e.target.value = "";
  }, []);

  /* ── Upload to Salesforce ── */

  const handleUpload = async () => {
    const uploadable = rows.filter((r) => r.status === "pending");
    if (uploadable.length === 0) {
      toast.error("No valid rows to upload");
      return;
    }

    setUploading(true);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status !== "pending") continue;

      // Mark uploading
      setRows((prev) => prev.map((r, j) => (j === i ? { ...r, status: "uploading" as RowStatus } : r)));

      try {
        const fields: Record<string, unknown> = {
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
        successCount++;
      } catch (err: any) {
        setRows((prev) =>
          prev.map((r, j) =>
            j === i ? { ...r, status: "error" as RowStatus, error: err.message || "Upload failed" } : r
          )
        );
        errorCount++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["sfdc-leads"] });
    setUploading(false);
    setDone(true);

    if (errorCount === 0) {
      toast.success(`All ${successCount} lead${successCount === 1 ? "" : "s"} uploaded successfully`);
    } else {
      toast.error(`${errorCount} failed, ${successCount} succeeded`);
    }
  };

  const reset = () => {
    setRows([]);
    setParseErrors([]);
    setDone(false);
  };

  const validCount = rows.filter((r) => r.status === "pending" || r.status === "success").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const successCount = rows.filter((r) => r.status === "success").length;

  /* ── Done state ── */

  if (done && successCount === rows.length) {
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
          <div className="flex items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-lg space-y-8">
              {/* Step 1: Download template */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  <h3 className="font-semibold">{t("Download the template")}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {t("Use this CSV template to format your leads. Required fields: Company, Website, Last Name, Email, Department(s), Number of Users, Current Tech Stack, and Use Case.")}
                </p>
                <div className="pl-8">
                  <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                    <Download className="h-4 w-4" />
                    {t("Download Template")}
                  </Button>
                </div>
              </div>

              {/* Step 2: Upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  <h3 className="font-semibold">{t("Upload your file")}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {t("Select your completed CSV file. Maximum 200 leads per upload.")}
                </p>
                <div className="pl-8">
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
                    className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{t("Click to select a CSV file")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("or drag and drop")}</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Preview / Results table ── */
          <div className="space-y-0">
            {/* Parse-level errors */}
            {parseErrors.length > 0 && (
              <div className="mx-3 sm:mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    {parseErrors.map((e, i) => (
                      <p key={i} className="text-destructive">{e}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summary bar */}
            <div className="border-b px-3 sm:px-6 py-3 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{rows.length} total</Badge>
              {validCount > 0 && !done && <Badge variant="outline" className="text-primary border-primary/30">{validCount} ready</Badge>}
              {errorCount > 0 && <Badge variant="outline" className="text-destructive border-destructive/30">{errorCount} error{errorCount !== 1 ? "s" : ""}</Badge>}
              {successCount > 0 && <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">{successCount} uploaded</Badge>}
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto border-b">
              <Table className="table-fixed [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[60px] font-semibold text-xs uppercase tracking-wider">#</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Company</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Email</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Use Case</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider hidden xl:table-cell">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className="h-[52px]">
                      <TableCell className="py-2 text-sm text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="py-2">
                        {row.status === "pending" && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Ready</span>
                        )}
                        {row.status === "uploading" && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {row.status === "success" && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                        {row.status === "error" && (
                          <Tooltip text={row.error}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm font-medium truncate block">{row.data["Company"] || "—"}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm truncate block">
                          {[row.data["First Name"], row.data["Last Name"]].filter(Boolean).join(" ") || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground truncate block">{row.data["Email"] || "—"}</span>
                      </TableCell>
                      <TableCell className="py-2 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground truncate block">{row.data["Use Case"] || "—"}</span>
                      </TableCell>
                      <TableCell className="py-2 hidden xl:table-cell">
                        {row.status === "error" && row.error && (
                          <span className="text-xs text-destructive truncate block">{row.error}</span>
                        )}
                      </TableCell>
                    </TableRow>
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
                {uploading ? t("Uploading...") : t(`Upload ${validCount} Lead${validCount === 1 ? "" : "s"}`)}
              </Button>
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

/* ── Simple inline tooltip for error messages ── */

function Tooltip({ text, children }: { text?: string; children: React.ReactNode }) {
  return (
    <span className="relative group cursor-help">
      {children}
      {text && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-popover border text-popover-foreground text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md">
          {text}
        </span>
      )}
    </span>
  );
}

export default PartnerBulkUpload;
