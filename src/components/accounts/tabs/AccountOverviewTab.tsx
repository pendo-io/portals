import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, Phone, MapPin, Users, DollarSign, Calendar, Radio, ExternalLink } from "lucide-react";
import type { SFDCAccount, SFDCContact, SFDCOpportunity } from "@/types/salesforce";
import type { Signal } from "@/data/mockSignals";

interface AccountOverviewTabProps {
  account: SFDCAccount;
  contacts: SFDCContact[];
  opportunities: SFDCOpportunity[];
}

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  "6sense New Hot Account": "Hot Account",
  "Sixth Sense Contact Engagement": "Contact Engagement",
  "Sixth Sense Recent Web Visits": "Web Visits",
  "Sixth Sense Recent Intent Activities": "Intent Activity",
  "Job Postings - Growth Flag": "Growth Flag",
  "Hiring": "Senior Hire",
  "News": "News",
  "Fundraising": "Fundraising",
  "Product Release": "Product Release",
  "Qualified Signals Engagement": "Qualified Signal",
};

function getSignalDescription(signal: Signal): string {
  const meta = signal.metaData;
  switch (signal.signalType) {
    case "6sense New Hot Account":
      return "Showing strong buying intent signals";
    case "Sixth Sense Contact Engagement":
      return meta ? `${meta.personName || "Contact"} engaging with ${meta.visited || "content"}` : signal.title;
    case "Sixth Sense Recent Web Visits":
      return meta?.pages ? `Visited: ${meta.pages.join(", ")}` : "Web visit activity";
    case "Sixth Sense Recent Intent Activities":
      return meta?.keywords ? `Keywords: ${meta.keywords.join(", ")}` : signal.title;
    case "Job Postings - Growth Flag":
      return `${meta?.pctGrowth || ""}% increase in hiring vs average`;
    case "Hiring":
      return meta ? `${meta.full_name || "New hire"} joined as ${signal.title}` : signal.title;
    case "Fundraising":
    case "News":
    case "Product Release":
      return meta?.news_publisher ? `${signal.title} — ${meta.news_publisher}` : signal.title;
    case "Qualified Signals Engagement":
      return meta ? `${meta.qTrend || "Active"} — ${meta.qCondition || ""}` : signal.title;
    default:
      return signal.title;
  }
}

function getInitials(signal: Signal): string {
  const meta = signal.metaData;
  if (meta?.full_name) {
    return meta.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  }
  if (meta?.personName) {
    return meta.personName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  }
  return signal.source.slice(0, 2).toUpperCase();
}

export function AccountOverviewTab({ account, contacts, opportunities }: AccountOverviewTabProps) {
  const location = [account.BillingCity, account.BillingState, account.BillingCountry]
    .filter(Boolean)
    .join(", ");

  const domain = account.Domain_Name__c || account.Website?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null;
  const ownerName = account.Owner?.Name || "Account Owner";

  const accountSignals: Signal[] = [
    {
      id: `${account.Id}-ov-1`,
      accountName: account.Name,
      accountDomain: domain,
      accountId: account.Id,
      accountType: account.Type,
      accountOwner: ownerName,
      accountOwnerEmail: "",
      title: "Sarah Chen",
      signalType: "Sixth Sense Contact Engagement",
      source: "6sense",
      publishDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      linkedinUrl: "https://www.linkedin.com/in/sarahchen",
      crmLink: null,
      metaData: { personName: "Sarah Chen", title: "VP of Product", visited: "pricing page, demo request" },
    },
    {
      id: `${account.Id}-ov-2`,
      accountName: account.Name,
      accountDomain: domain,
      accountId: account.Id,
      accountType: account.Type,
      accountOwner: ownerName,
      accountOwnerEmail: "",
      title: "Director of Engineering",
      signalType: "Hiring",
      source: "Clay",
      publishDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      linkedinUrl: "https://www.linkedin.com/in/alexrivera",
      crmLink: null,
      metaData: { full_name: "Alex Rivera", job_start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    },
    {
      id: `${account.Id}-ov-3`,
      accountName: account.Name,
      accountDomain: domain,
      accountId: account.Id,
      accountType: account.Type,
      accountOwner: ownerName,
      accountOwnerEmail: "",
      title: "Web visit activity",
      signalType: "Sixth Sense Recent Web Visits",
      source: "6sense",
      publishDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      linkedinUrl: null,
      crmLink: null,
      metaData: { pages: ["pricing", "case-studies", "product-analytics"] },
    },
  ];

  const totalPipelineValue = opportunities.reduce((sum, opp) => sum + (opp.Amount || 0), 0);
  const openOpps = opportunities.filter(
    (o) => !["Closed Won", "Closed Lost"].includes(o.StageName)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {account.Industry && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Industry</span>
              <span className="font-medium">{account.Industry}</span>
            </div>
          )}
          {account.Type && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{account.Type}</span>
            </div>
          )}
          {account.Website && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Website</span>
              <a
                href={account.Website.startsWith("http") ? account.Website : `https://${account.Website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline flex items-center gap-1"
              >
                <Globe className="h-3 w-3" />
                {account.Website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {account.Phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {account.Phone}
              </span>
            </div>
          )}
          {location && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Key Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {account.NumberOfEmployees && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employees</span>
              <span className="font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                {account.NumberOfEmployees.toLocaleString()}
              </span>
            </div>
          )}
          {account.AnnualRevenue && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annual Revenue</span>
              <span className="font-medium">
                ${(account.AnnualRevenue / 1_000_000).toFixed(1)}M
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contacts</span>
            <span className="font-medium">{contacts.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Open Opportunities</span>
            <span className="font-medium">{openOpps.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pipeline Value</span>
            <span className="font-medium">
              ${totalPipelineValue.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">
              {new Date(account.CreatedDate).toLocaleDateString()}
            </span>
          </div>
          {account.LastModifiedDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Modified</span>
              <span className="font-medium">
                {new Date(account.LastModifiedDate).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Owner</span>
            <span className="font-medium">{account.Owner?.Name || "-"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {account.Description && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {account.Description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Intent Signals Timeline */}
      {accountSignals.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Intent Signals
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                {accountSignals.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {accountSignals.map((signal) => (
                  <div key={signal.id} className="relative flex gap-4 pl-0">
                    {/* Avatar circle */}
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground border border-border">
                      {getInitials(signal)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {signal.metaData?.full_name || signal.metaData?.personName ? (
                          <span className="text-sm font-medium">
                            {signal.metaData.full_name || signal.metaData.personName}
                          </span>
                        ) : null}
                        {signal.metaData?.title || (signal.signalType === "Hiring" && signal.title) ? (
                          <span className="text-sm text-muted-foreground">
                            {signal.metaData?.title || signal.title}
                          </span>
                        ) : null}
                        {signal.linkedinUrl && (
                          <a
                            href={signal.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {new Date(signal.publishDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mt-0.5">
                        {getSignalDescription(signal)}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[11px] py-0 px-2 rounded-full font-normal">
                          {SIGNAL_TYPE_LABELS[signal.signalType] || signal.signalType}
                        </Badge>
                        {signal.metaData?.pages?.map((page: string) => (
                          <Badge key={page} variant="secondary" className="text-[11px] py-0 px-2 rounded-full font-normal">
                            /{page}
                          </Badge>
                        ))}
                        {signal.metaData?.keywords?.map((kw: string) => (
                          <Badge key={kw} variant="secondary" className="text-[11px] py-0 px-2 rounded-full font-normal">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
