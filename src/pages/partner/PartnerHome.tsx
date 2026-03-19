import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Users, Target, FileText, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
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
  const { data: leadsData, isLoading: leadsLoading } = useSfdcLeads();
  const { data: oppsData, isLoading: oppsLoading } = useSfdcOpportunities();

  const leads = leadsData?.records ?? [];
  const opps = oppsData?.records ?? [];

  const leadStats = useMemo(() => {
    const active = leads.filter(
      (l) => !l.Status.toLowerCase().includes("closed") && !l.Status.toLowerCase().includes("disqualified")
    );
    const newLeads = leads.filter(
      (l) => l.Status === "Open - Not Contacted" || l.Status === "New"
    );
    return { active: active.length, total: leads.length, newCount: newLeads.length };
  }, [leads]);

  const oppStats = useMemo(() => {
    const open = opps.filter((o) => o.StageName !== "Closed Won" && o.StageName !== "Closed Lost");
    const won = opps.filter((o) => o.StageName === "Closed Won");
    return {
      openCount: open.length,
      pipeline: open.reduce((sum, o) => sum + (o.Amount ?? 0), 0),
      wonCount: won.length,
      wonTotal: won.reduce((sum, o) => sum + (o.Amount ?? 0), 0),
    };
  }, [opps]);

  const recentActivity = useMemo(() => {
    const items: { id: string; path: string; description: string; time: string; date: Date }[] = [];
    for (const lead of leads.slice(0, 10)) {
      items.push({
        id: lead.Id,
        path: `/portal/partner/leads/${lead.Id}`,
        description: `New lead: ${lead.Company} (${lead.Name})`,
        time: new Date(lead.CreatedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        date: new Date(lead.CreatedDate),
      });
    }
    for (const opp of opps.slice(0, 10)) {
      const amount = opp.Amount != null ? ` - ${formatCurrency(opp.Amount)}` : "";
      items.push({
        id: opp.Id,
        path: `/portal/partner/opportunities/${opp.Id}`,
        description: `Opportunity: ${opp.Name}${amount} (${opp.StageName})`,
        time: new Date(opp.CloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        date: new Date(opp.CloseDate),
      });
    }
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
  }, [leads, opps]);

  return (
    <div className="flex-1 p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your partnership overview.</p>
        </div>
        <Button onClick={() => navigate("/portal/partner/referral")}>
          <FileText className="h-4 w-4 mr-1.5" />
          New Referral
        </Button>
      </div>

      {/* Stats Grid — each card renders independently */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Leads"
          value={leadsLoading ? null : String(leadStats.active)}
          sub={leadsLoading ? null : `${leadStats.total} total`}
          icon={Users}
          color="text-blue-600"
        />
        <StatCard
          label="Open Opportunities"
          value={oppsLoading ? null : String(oppStats.openCount)}
          sub={oppsLoading ? null : `${formatCurrency(oppStats.pipeline)} pipeline`}
          icon={Target}
          color="text-emerald-600"
        />
        <StatCard
          label="New Leads"
          value={leadsLoading ? null : String(leadStats.newCount)}
          sub={leadsLoading ? null : "Awaiting outreach"}
          icon={Clock}
          color="text-amber-600"
        />
        <StatCard
          label="Closed Won"
          value={oppsLoading ? null : String(oppStats.wonCount)}
          sub={oppsLoading ? null : `${formatCurrency(oppStats.wonTotal)} revenue`}
          icon={CheckCircle2}
          color="text-primary"
        />
      </div>

      {/* Quick Links — always visible immediately */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate("/portal/partner/leads")}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">View Leads</p>
                <p className="text-xs text-muted-foreground">Manage your lead pipeline</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate("/portal/partner/opportunities")}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-sm">View Opportunities</p>
                <p className="text-xs text-muted-foreground">Track deal progress</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate("/portal/partner/referral")}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Submit Referral</p>
                <p className="text-xs text-muted-foreground">Register a new lead referral</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading && oppsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors"
                  onClick={() => navigate(activity.path)}
                >
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | null;
  sub: string | null;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${color}`} />
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
