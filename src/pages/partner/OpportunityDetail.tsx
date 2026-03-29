import { useParams, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePortalType } from "@/hooks/usePortalType";
import { useAuth } from "@/hooks/useAuth";
import { useSfdcOpportunityDetail } from "@/hooks/useSfdcOpportunityDetail";
import { useSfdcApprovalHistory } from "@/hooks/useSfdcApprovalHistory";
import { useSfdcBillingInstallments } from "@/hooks/useSfdcBillingInstallments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  Target,
  Tag,
  Calendar,
  DollarSign,
  User,
  Building2,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  CircleDot,
  ExternalLink,
} from "lucide-react";

function Row({ label, value, wrap }: { label: string; value: string | number | null | undefined; wrap?: boolean }) {
  const display = value == null || value === "" ? "—" : typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium text-right ${wrap ? "break-words" : "truncate"} ${display === "—" ? "text-muted-foreground font-normal" : ""}`}>{display}</span>
    </div>
  );
}

const fmtCurrency = (v: number | null): string | null => {
  if (v == null) return null;
  return `USD ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDate = (d: string | null): string | null => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function OpportunityDetail() {
  const { oppId } = useParams<{ oppId: string }>();
  const navigate = useNavigate();
  const { basePath } = usePortalType();
  const { isSuperAdmin, impersonating } = useAuth();
  const showSfdcLink = isSuperAdmin && !impersonating;
  const { data, isLoading, isError, error, refetch } = useSfdcOpportunityDetail(oppId);
  const { data: approvalData, isLoading: approvalsLoading } = useSfdcApprovalHistory(oppId);
  const { data: biData, isLoading: biLoading } = useSfdcBillingInstallments(oppId);

  const opp = data?.records?.[0];
  const approvals = approvalData?.records ?? [];

  useDocumentTitle(opp?.Name ? `${opp.Name} - Opportunity` : "Opportunity Detail");

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading opportunity...</p>
        </div>
      </div>
    );
  }

  if (isError || !opp) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-destructive font-medium">
            {isError ? "Failed to load opportunity" : "Opportunity not found"}
          </p>
          {isError && (
            <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
          )}
          <div className="flex items-center gap-2 justify-center">
            {isError && (
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(`${basePath}/opportunities`)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Opportunities
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b px-3 sm:px-6 py-4 sm:py-5 bg-card/30">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{opp.Account?.Name ?? "Opportunity"}</p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{opp.Name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {opp.Owner?.Name ?? "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                TCV {opp.Amount != null ? fmtCurrency(opp.Amount) : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              {opp.StageName}
            </span>
            {showSfdcLink && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://pendo.lightning.force.com/lightning/r/Opportunity/${opp.Id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      View in Salesforce
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Only visible to admins</TooltipContent>
              </Tooltip>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(`${basePath}/opportunities`)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-auto">
        <div className="p-3 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Opportunity Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Opportunity Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0">
                <Row label="Type" value={opp.Type} />
                <Row label="Stage" value={opp.StageName} />
                <Row label="Opportunity Owner" value={opp.Owner?.Name} />
              </CardContent>
            </Card>

            {/* Financials */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financials
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0">
                <Row label="TCV" value={fmtCurrency(opp.Amount)} />
                <Row label="ARR" value={fmtCurrency(opp.ARR__c)} />
                <Row label="Net ARR" value={fmtCurrency(opp.Net_ARR__c)} />
              </CardContent>
            </Card>

            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0">
                <Row label="Created Date" value={fmtDate(opp.CreatedDate)} />
                <Row label="Close Date" value={fmtDate(opp.CloseDate)} />
                <Row label="Expiration Date" value={fmtDate(opp.Expiration_Date__c)} />
              </CardContent>
            </Card>

            {/* Partner & Product Details */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Partner & Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <Row label="Solution Partner/SI" value={opp.Solution_Partner_SI__c} />
                    <Row label="Referring Account Owner" value={opp.Referring_Account_Owner__r?.Name} />
                  </div>
                  <div>
                    <Row label="Cloud Hosting / Hyperscalers" value={opp.Cloud_Hosting_Commit_Hyperscalers__c} />
                    <Row label="Data Warehouse Provider" value={opp.Data_Warehouse_Provider__c} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Role Details */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Role Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <Row label="Initial Contact" value={opp.Initial_Contact__r?.Name} />
                  </div>
                  <div>
                    <Row label="Initial Contact Role" value={opp.Initial_Contact_Role__c} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {opp.Next_Steps__c || "—"}
                </p>
              </CardContent>
            </Card>

            {/* Approval History */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Approval History
                  {approvals.length > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                      {approvals.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvalsLoading ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading approvals...</span>
                  </div>
                ) : approvals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No approval history</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border" />
                    <div className="space-y-4">
                      {approvals.map((step) => {
                        const isApproved = step.StepStatus === "Approved";
                        const isRejected = step.StepStatus === "Rejected";
                        const StatusIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : CircleDot;
                        const statusColor = isApproved
                          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                          : isRejected
                            ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                            : "text-blue-600 bg-blue-50 dark:bg-blue-900/20";

                        return (
                          <div key={step.Id} className="relative flex gap-3 pl-0">
                            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${statusColor}`}>
                              <StatusIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  isApproved
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : isRejected
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                }`}>
                                  {step.StepStatus}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                                  {new Date(step.CreatedDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm flex-wrap">
                                {step.OriginalActor?.Name && (
                                  <span className="text-muted-foreground">
                                    Assigned to: <span className="font-medium text-foreground">{step.OriginalActor.Name}</span>
                                  </span>
                                )}
                                {step.Actor?.Name && step.Actor.Name !== step.OriginalActor?.Name && (
                                  <span className="text-muted-foreground">
                                    Approver: <span className="font-medium text-foreground">{step.Actor.Name}</span>
                                  </span>
                                )}
                              </div>
                              {step.Comments && (
                                <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">
                                  {step.Comments}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Billing Installments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Billing Installments
                {(biData?.records?.length ?? 0) > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                    {biData!.records.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {biLoading ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading billing installments...</span>
                </div>
              ) : !biData?.records?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No billing installments</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Installment Name</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Referral Commission</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Payment Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {biData.records.map((bi) => (
                        <TableRow key={bi.Id} className="h-[44px]">
                          <TableCell className="text-sm font-medium">{bi.Name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground tabular-nums">
                            {bi.Installment_Date__c
                              ? new Date(bi.Installment_Date__c).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {bi.Referral_Commission_Amount__c != null
                              ? `$${bi.Referral_Commission_Amount__c.toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {bi.Referral_Commission_Payment_Status__c ? (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {bi.Referral_Commission_Payment_Status__c}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
