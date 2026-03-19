import { useParams, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSfdcOpportunityDetail } from "@/hooks/useSfdcOpportunityDetail";
import { useSfdcApprovalHistory } from "@/hooks/useSfdcApprovalHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  Prospecting: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  Qualification: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Needs Analysis": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Value Proposition": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  Proposal: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Proposal/Price Quote": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  Negotiation: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Negotiation/Review": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Closed Won": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Closed Lost": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function getStageColor(stage: string | null): string {
  if (!stage) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  return STAGE_COLORS[stage] || "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
}

function Row({ label, value, wrap }: { label: string; value: string | number | null | undefined; wrap?: boolean }) {
  if (value == null || value === "") return null;
  const display = typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium text-right ${wrap ? "break-words" : "truncate"}`}>{display}</span>
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
  const { data, isLoading, isError, error } = useSfdcOpportunityDetail(oppId);
  const { data: approvalData, isLoading: approvalsLoading } = useSfdcApprovalHistory(oppId);

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
          <Button variant="outline" size="sm" onClick={() => navigate("/portal/partner/opportunities")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Opportunities
          </Button>
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
              {opp.Owner?.Name && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {opp.Owner.Name}
                </span>
              )}
              {opp.CloseDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Close {fmtDate(opp.CloseDate)}
                </span>
              )}
              {opp.Amount != null && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  {fmtCurrency(opp.Amount)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStageColor(opp.StageName)}`}>
              {opp.StageName}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate("/portal/partner/opportunities")}>
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
                <Row label="Opportunity Name" value={opp.Name} wrap />
                <Row label="Account Name" value={opp.Account?.Name} />
                <Row label="Type" value={opp.Type} />
                <Row label="Stage" value={opp.StageName} />
                <Row label="Probability" value={opp.Probability != null ? `${opp.Probability}%` : null} />
                <Row label="Lead Source" value={opp.LeadSource} />
                <Row label="Transaction Type" value={opp.Transaction_Type__c} />
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
                <Row label="TCV (Amount)" value={fmtCurrency(opp.Amount)} />
                <Row label="TCV (USD)" value={opp.TCV_USD__c?.toLocaleString() ?? null} />
                <Row label="ARR" value={fmtCurrency(opp.ARR__c)} />
                <Row label="ARR (USD)" value={opp.ARR_USD__c?.toLocaleString() ?? null} />
                <Row label="Net ARR" value={fmtCurrency(opp.Net_ARR__c)} />
                <Row label="Net ARR %" value={opp.Net_ARR_Percentage__c != null ? `${opp.Net_ARR_Percentage__c}%` : null} />
              </CardContent>
            </Card>

            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0">
                <Row label="Close Date" value={fmtDate(opp.CloseDate)} />
                <Row label="Expiration Date" value={fmtDate(opp.Expiration_Date__c)} />
                <Row label="Pipeline Date" value={fmtDate(opp.Pipeline_Date__c)} />
                <Row label="Opportunity Owner" value={opp.Owner?.Name} />
                <Row label="Created Date" value={fmtDate(opp.CreatedDate)} />
                <Row label="Created By" value={opp.CreatedBy?.Name} />
                <Row label="Created By Role" value={opp.Created_By_Role__c} />
              </CardContent>
            </Card>

            {/* Partner Details */}
            {(opp.Partner_Relationship__c || opp.Partner_Sub_type__c || opp.Primary_Competitor_Names__c || opp.Initial_Product_Interest__c) && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Partner & Product Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8">
                    <div>
                      <Row label="Partner Relationship" value={opp.Partner_Relationship__c} />
                      <Row label="Partner Sub-type" value={opp.Partner_Sub_type__c} />
                    </div>
                    <div>
                      <Row label="Initial Product Interest" value={opp.Initial_Product_Interest__c} wrap />
                      <Row label="Primary Competitors" value={opp.Primary_Competitor_Names__c} wrap />
                    </div>
                    <div>
                      <Row label="Transaction Type" value={opp.Transaction_Type__c} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            {opp.Next_Steps__c && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {opp.Next_Steps__c}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Management Notes */}
            {opp.Management_Notes__c && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Management Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {opp.Management_Notes__c}
                  </p>
                </CardContent>
              </Card>
            )}

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
        </div>
      </div>
    </div>
  );
}
