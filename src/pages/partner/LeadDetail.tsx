import { useParams, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePortalType } from "@/hooks/usePortalType";
import { useSfdcLeadDetail } from "@/hooks/useSfdcLeadDetail";
import { useSfdcApprovalHistory } from "@/hooks/useSfdcApprovalHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ExternalLink,
  ArrowLeft,
  Building2,
  Mail,
  Globe,
  User,
  Calendar,
  Tag,
  Users,
  MapPin,
  Lightbulb,
  Swords,
  Monitor,
  Briefcase,
  FileText,
  Clock,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  CircleDot,
} from "lucide-react";

function Row({ label, value, href, wrap }: { label: string; value: string | number | null | undefined; href?: string; wrap?: boolean }) {
  if (value == null || value === "") return null;
  const display = typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-medium text-primary hover:underline text-right ${wrap ? "break-words" : "truncate"}`}
        >
          {display}
        </a>
      ) : (
        <span className={`font-medium text-right ${wrap ? "break-words" : "truncate"}`}>{display}</span>
      )}
    </div>
  );
}

export default function LeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { basePath } = usePortalType();
  const { data, isLoading, isError, error } = useSfdcLeadDetail(leadId);
  const { data: approvalData, isLoading: approvalsLoading } = useSfdcApprovalHistory(leadId);

  const lead = data?.records?.[0];
  const approvals = approvalData?.records ?? [];

  useDocumentTitle(lead?.Name ? `${lead.Name} - Lead` : "Lead Detail");

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading lead...</p>
        </div>
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-destructive font-medium">
            {isError ? "Failed to load lead" : "Lead not found"}
          </p>
          {isError && (
            <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`${basePath}/leads`)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  const address = [lead.Street, lead.City, lead.State, lead.PostalCode, lead.Country]
    .filter(Boolean)
    .join(", ");

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const websiteDisplay = lead.Website?.replace(/^https?:\/\/(www\.)?/, "");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b px-3 sm:px-6 py-4 sm:py-5 bg-card/30">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{lead.Company}</p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{lead.Name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {lead.Email && (
                <a
                  href={`mailto:${lead.Email}`}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {lead.Email}
                </a>
              )}
              {address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {address}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              {lead.Status}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate(`${basePath}/leads`)}>
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

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0">
                <Row label="Name" value={lead.Name} />
                <Row label="Email" value={lead.Email} href={lead.Email ? `mailto:${lead.Email}` : undefined} />
                <Row
                  label="Website"
                  value={websiteDisplay}
                  href={lead.Website ? (lead.Website.startsWith("http") ? lead.Website : `https://${lead.Website}`) : undefined}
                />
                <Row label="Department(s)" value={lead.Department_s__c} />
              </CardContent>
            </Card>

            {/* Lead Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Lead Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0">
                <Row label="Status" value={lead.Status} />
                <Row label="Lead Source" value={lead.LeadSource} />
                <Row label="Lead Owner" value={lead.Owner?.Name} />
                <Row label="Partner Account" value={lead.Referral_Partner_Account__r?.Name} />
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
                <Row label="Number of Users" value={lead.Number_of_Users__c} />
                <Row label="Use Case" value={lead.Use_Case__c} />
                <Row label="Created Date" value={formatDate(lead.CreatedDate)} />
                <Row label="Created By" value={lead.CreatedBy?.Name} />
              </CardContent>
            </Card>

            {/* Opportunity Details */}
            {(lead.Number_of_Users__c || lead.Use_Case__c || lead.Current_Tech_Stack_Solutions__c) && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Opportunity Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8">
                    <div>
                      <Row label="Use Case" value={lead.Use_Case__c} />
                      <Row label="Number of Users" value={lead.Number_of_Users__c} />
                    </div>
                    <div>
                      {lead.Current_Tech_Stack_Solutions__c && (
                        <div className="py-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <Monitor className="h-3.5 w-3.5" />
                            Current Tech Stack
                          </div>
                          <p className="font-medium whitespace-pre-wrap">{lead.Current_Tech_Stack_Solutions__c}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      {lead.Competitors_Considered_or_Incumbent__c && (
                        <div className="py-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <Swords className="h-3.5 w-3.5" />
                            Competitors / Incumbent
                          </div>
                          <p className="font-medium whitespace-pre-wrap">{lead.Competitors_Considered_or_Incumbent__c}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Information */}
            {lead.Additional_Information__c && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {lead.Additional_Information__c}
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
