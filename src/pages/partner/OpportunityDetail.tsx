import { useParams, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePortalType } from "@/hooks/usePortalType";
import { useAuth } from "@/hooks/useAuth";
import { useSfdcOpportunityDetail } from "@/hooks/useSfdcOpportunityDetail";
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
  DollarSign,
  User,
  Building2,
  FileText,
  ExternalLink,
  Info,
} from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";

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
  const { data: biData, isLoading: biLoading } = useSfdcBillingInstallments(oppId);

  const opp = data?.records?.[0];

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
              <div className="h-10 w-10 flex items-center justify-center shrink-0">
                <CompanyLogo
                  website={opp.Account?.Website}
                  fallback={<Target className="h-5 w-5 text-primary" />}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{opp.Account?.Name ?? "Opportunity"}</p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{opp.Name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

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
                <Row label="Created Date" value={fmtDate(opp.CreatedDate)} />
              </CardContent>
            </Card>

            {/* Deal Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Deal Details
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-default" />
                    </TooltipTrigger>
                    <TooltipContent>Partner referral fees are paid on eligible year 1 ARR only</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0">
                <Row label="TCV" value={fmtCurrency(opp.Amount)} />
                <Row label="ARR" value={fmtCurrency(opp.ARR__c)} />
                <Row label="Close Date" value={fmtDate(opp.CloseDate)} />
              </CardContent>
            </Card>

            {/* AE Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Opportunity Owner Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0">
                <Row label="Name" value={opp.Owner?.Name} />
                <Row label="Email" value={opp.Owner?.Email} />
                <Row label="Title" value={opp.Owner?.Title} />
              </CardContent>
            </Card>

            {/* Contact Role Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Initial Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0">
                <Row label="Initial Contact" value={opp.Initial_Contact__r?.Name} />
                <Row label="Email" value={opp.Initial_Contact__r?.Email} />
                <Row label="Role" value={opp.Initial_Contact_Role__c} />
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="md:col-span-2">
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

          {/* Billing Installments */}
          <Card className="md:col-span-2">
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
    </div>
  );
}
