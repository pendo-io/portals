import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePortalType } from "@/hooks/usePortalType";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Users, Target, FileText } from "lucide-react";
import { useSfdcLeads } from "@/hooks/useSfdcLeads";
import { useSfdcOpportunities } from "@/hooks/useSfdcOpportunities";

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const PartnerHome = () => {
  useDocumentTitle("Home");
  const navigate = useNavigate();
  const { basePath, t } = usePortalType();
  const { data: leadsData, isLoading: leadsLoading } = useSfdcLeads();
  const { data: oppsData, isLoading: oppsLoading } = useSfdcOpportunities();

  const leads = leadsData?.records ?? [];
  const opps = oppsData?.records ?? [];

  const leadStats = useMemo(() => {
    const active = leads.filter(
      (l) => !l.Status.toLowerCase().includes("closed") && !l.Status.toLowerCase().includes("disqualified")
    );
    return { active: active.length, total: leads.length };
  }, [leads]);

  const oppStats = useMemo(() => {
    const open = opps.filter((o) => o.StageName !== "Closed Won" && o.StageName !== "Closed Lost");
    return {
      openCount: open.length,
      pipeline: open.reduce((sum, o) => sum + (o.Amount ?? 0), 0),
    };
  }, [opps]);

  const newestLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime())
      .slice(0, 8);
  }, [leads]);

  const upcomingOpps = useMemo(() => {
    const now = new Date();
    return opps
      .filter((o) => o.StageName !== "Closed Won" && o.StageName !== "Closed Lost" && new Date(o.CloseDate) >= now)
      .sort((a, b) => new Date(a.CloseDate).getTime() - new Date(b.CloseDate).getTime())
      .slice(0, 8);
  }, [opps]);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-y-auto">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("Overview")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("Welcome back. Here's your partnership overview.")}</p>
        </div>
        <Button onClick={() => navigate(`${basePath}/referral`)}>
          <FileText className="h-4 w-4 mr-1.5" />
          {t("New Referral")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: "75ms" }}>
        <StatCard
          label={t("All Leads")}
          value={leadsLoading ? null : String(leads.length)}
          icon={Users}
        />
        <StatCard
          label={t("All Opportunities")}
          value={oppsLoading ? null : String(opps.length)}
          sub={oppsLoading ? null : `${formatCurrency(opps.reduce((sum, o) => sum + (o.Amount ?? 0), 0))} ${t("pipeline")}`}
          icon={Target}
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "150ms" }}>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`${basePath}/leads`)}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{t("View Leads")}</p>
                <p className="text-xs text-muted-foreground">{t("Manage your lead pipeline")}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`${basePath}/opportunities`)}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{t("View Opportunities")}</p>
                <p className="text-xs text-muted-foreground">{t("Track deal progress")}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`${basePath}/referral`)}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{t("Submit Referral")}</p>
                <p className="text-xs text-muted-foreground">{t("Register a new lead referral")}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Leads by Created Date & Opportunities by Close Date */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up" style={{ animationDelay: "225ms" }}>
        {/* Leads by Created Date */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Leads by Created Date</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate(`${basePath}/leads`)}>
              {t("View Leads")}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : newestLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("No leads found")}</p>
            ) : (
              <div className="space-y-1">
                {newestLeads.map((lead) => (
                  <div
                    key={lead.Id}
                    className="flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-md transition-colors"
                    onClick={() => navigate(`${basePath}/leads/${lead.Id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{lead.Company}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.Name} {lead.Email ? `- ${lead.Email}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {new Date(lead.CreatedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opportunities by Close Date */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Opportunities by Close Date</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate(`${basePath}/opportunities`)}>
              {t("View Opportunities")}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {oppsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : upcomingOpps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("No opportunities found")}</p>
            ) : (
              <div className="space-y-1">
                {upcomingOpps.map((opp) => {
                  const closeDate = new Date(opp.CloseDate);
                  const now = new Date();
                  const daysUntil = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div
                      key={opp.Id}
                      className="flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-md transition-colors"
                      onClick={() => navigate(`${basePath}/opportunities/${opp.Id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{opp.Name}</p>
                        <p className="text-xs text-muted-foreground truncate">{opp.Account?.Name ?? "—"} - {opp.StageName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium tabular-nums">
                          {closeDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  sub: string | null;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {value === null ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
        {sub === null ? (
          <Skeleton className="h-3 w-24 mt-2" />
        ) : (
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default PartnerHome;
