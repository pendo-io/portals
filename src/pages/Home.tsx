import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalsTable } from "@/components/signals/SignalsTable";
import { AccountLogo } from "@/components/accounts/AccountLogo";
import { useAccounts } from "@/hooks/useAccounts";
import { useNextOpportunities } from "@/hooks/useAccounts";
import { useMySignals } from "@/hooks/useMySignals";
import { useDismissedSignals } from "@/hooks/useDismissedSignals";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Video, Workflow } from "lucide-react";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const Home = () => {
  const navigate = useNavigate();

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { nextOppMap, isLoading: oppsLoading } = useNextOpportunities();

  // Top 5 closest-closing deals sorted by CloseDate asc
  const closestDeals = useMemo(() => {
    if (!accounts) return [];
    const deals: { account: (typeof accounts)[0]; opp: ReturnType<typeof nextOppMap.get> }[] = [];
    for (const acct of accounts) {
      const opp = nextOppMap.get(acct.Id);
      if (opp) deals.push({ account: acct, opp });
    }
    return deals
      .sort((a, b) => new Date(a.opp!.CloseDate).getTime() - new Date(b.opp!.CloseDate).getTime())
      .slice(0, 5);
  }, [accounts, nextOppMap]);

  // Mock signals remapped to user's real accounts
  const mySignals = useMySignals(accounts);
  const { dismissedIds, dismissSignal } = useDismissedSignals();

  const recentSignals = useMemo(
    () =>
      [...mySignals]
        .filter((s) => !dismissedIds.has(s.id))
        .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
        .slice(0, 10),
    [mySignals, dismissedIds],
  );

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value}`;
  };

  const statsLoading = accountsLoading || oppsLoading;

  return (
    <div className="flex-1 p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Let's make the leap ⛷️
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/workflows")}>
            <Workflow className="h-4 w-4 mr-1.5" />
            Workflows
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/meetings")}>
            <Video className="h-4 w-4 mr-1.5" />
            Meetings
          </Button>
        </div>
      </div>

      {/* Closest Closing Deals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Closest Closing Deals</CardTitle>
          <button
            onClick={() => navigate("/accounts")}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View All Accounts <ArrowRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                </div>
              ))}
            </div>
          ) : closestDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No open opportunities</p>
          ) : (
            <div className="overflow-x-auto -mx-6 -mb-6">
              <Table className="[&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Account</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Opportunity</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Stage</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-right hidden md:table-cell">Close Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closestDeals.map(({ account, opp }) => (
                    <TableRow
                      key={opp!.Id}
                      className="cursor-pointer hover:bg-muted/50 h-[52px]"
                      onClick={() => navigate(`/accounts/${account.Id}`)}
                    >
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
                          <AccountLogo domain={account.Domain_Name__c} name={account.Name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-tight truncate">{account.Name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{opp!.Name}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          <TrendingUp className="h-3 w-3" />
                          {opp!.StageName}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className="text-sm font-medium tabular-nums">
                          {opp!.Amount ? formatCurrency(opp!.Amount) : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right hidden md:table-cell">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(opp!.CloseDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Signals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">My Recent Signals</CardTitle>
          <button
            onClick={() => navigate("/signals")}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View All Signals <ArrowRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          <SignalsTable signals={recentSignals} onDismiss={dismissSignal} />
        </CardContent>
      </Card>

      {DEV_BYPASS && (
        <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border/50 px-3 sm:px-6 py-2 text-center bg-background">
          <p className="text-xs text-muted-foreground">Using mock signal data in dev mode</p>
        </div>
      )}
    </div>
  );
};

export default Home;
