import { useParams, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSfdcLeadDetail } from "@/hooks/useSfdcLeadDetail";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ExternalLink,
  ArrowLeft,
  Building2,
  Mail,
  Globe,
  User,
  Briefcase,
  Calendar,
  FileText,
  Tag,
  Users,
  MapPin,
  Lightbulb,
  Swords,
  Monitor,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Open - Not Contacted": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Working - Contacted": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Closed - Converted": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Closed - Not Converted": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  New: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Contacted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Qualified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  Nurturing: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  Disqualified: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function getStatusColor(status: string | null): string {
  if (!status) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  return STATUS_COLORS[status] || "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
}

function DetailField({ icon: Icon, label, value, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
  href?: string;
}) {
  if (value == null || value === "") return null;
  const display = typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline break-all"
          >
            {display}
          </a>
        ) : (
          <p className="text-sm font-medium break-words">{display}</p>
        )}
      </div>
    </div>
  );
}

export default function LeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useSfdcLeadDetail(leadId);

  const lead = data?.records?.[0];

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
          <Button variant="outline" size="sm" onClick={() => navigate("/portal/partner/leads")}>
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
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Lead</p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{lead.Name}</h1>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(lead.Status)}`}>
                {lead.Status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {lead.Company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {lead.Company}
                </span>
              )}
              {lead.LeadSource && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {lead.LeadSource}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate("/portal/partner/leads")}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://pendo--full.sandbox.lightning.force.com/${lead.Id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View in SFDC
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Detail fields */}
      <div className="flex-1 overflow-auto">
        <div className="p-3 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0 max-w-5xl">
            {/* Left column */}
            <div>
              <DetailField icon={Building2} label="Company" value={lead.Company} />
              <DetailField icon={User} label="Name" value={lead.Name} />
              <DetailField
                icon={Mail}
                label="Email"
                value={lead.Email}
                href={lead.Email ? `mailto:${lead.Email}` : undefined}
              />
              <DetailField icon={Briefcase} label="Department(s)" value={lead.Department_s__c} />
              <DetailField icon={Lightbulb} label="Use Case" value={lead.Use_Case__c} />
              <DetailField icon={Swords} label="Competitors Considered or Incumbent?" value={lead.Competitors_Considered_or_Incumbent__c} />
              <DetailField
                icon={Globe}
                label="Website"
                value={lead.Website}
                href={lead.Website ? (lead.Website.startsWith("http") ? lead.Website : `https://${lead.Website}`) : undefined}
              />
              <DetailField icon={Building2} label="Referral Partner Account" value={lead.Referral_Partner_Account__c} />
            </div>

            {/* Right column */}
            <div>
              <DetailField icon={Users} label="Number of Users" value={lead.Number_of_Users__c} />
              <DetailField icon={Monitor} label="Current Tech Stack/Solutions" value={lead.Current_Tech_Stack_Solutions__c} />
              <DetailField icon={Tag} label="Lead Status" value={lead.Status} />
              <DetailField icon={User} label="Lead Owner" value={lead.Owner?.Name} />
              <DetailField icon={Tag} label="Lead Source" value={lead.LeadSource} />
              <DetailField icon={User} label="Created By" value={lead.CreatedBy?.Name} />
              <DetailField icon={Calendar} label="Created Date" value={formatDate(lead.CreatedDate)} />
              <DetailField icon={MapPin} label="Address" value={address || null} />
            </div>
          </div>

          {/* Additional Information */}
          {lead.Additional_Information__c && (
            <div className="mt-6 max-w-5xl">
              <div className="flex items-start gap-3 py-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Additional Information</p>
                  <p className="text-sm font-medium whitespace-pre-wrap mt-1">{lead.Additional_Information__c}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
