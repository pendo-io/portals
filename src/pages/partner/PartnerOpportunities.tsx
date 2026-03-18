import { useState, useMemo } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, TrendingUp, DollarSign, Target } from "lucide-react";
import { useSfdcOpportunities } from "@/hooks/useSfdcOpportunities";

const stageColors: Record<string, string> = {
  Prospecting: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  Qualification: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "Needs Analysis": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "Value Proposition": "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  "Id. Decision Makers": "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  "Perception Analysis": "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Proposal: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  "Proposal/Price Quote": "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Negotiation: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Negotiation/Review": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Closed Won": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "Closed Lost": "bg-red-500/10 text-red-700 dark:text-red-400",
};

const fallbackStageColor = "bg-gray-500/10 text-gray-700 dark:text-gray-400";

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const PartnerOpportunities = () => {
  useDocumentTitle("Opportunities");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const { data, isLoading, isError } = useSfdcOpportunities();

  const opps = data?.records ?? [];

  const stages = [...new Set(opps.map((o) => o.StageName))].sort();

  const filtered = opps.filter((opp) => {
    const matchesSearch =
      opp.Name?.toLowerCase().includes(search.toLowerCase()) ||
      opp.Account?.Name?.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === "all" || opp.StageName === stageFilter;
    return matchesSearch && matchesStage;
  });

  const { totalPipeline, weightedPipeline, wonAmount, openCount } = useMemo(() => {
    const open = opps.filter((o) => o.StageName !== "Closed Won" && o.StageName !== "Closed Lost");
    const won = opps.filter((o) => o.StageName === "Closed Won");
    return {
      totalPipeline: open.reduce((sum, o) => sum + (o.Amount ?? 0), 0),
      weightedPipeline: open.reduce((sum, o) => sum + (o.Amount ?? 0) * ((o.Probability ?? 0) / 100), 0),
      wonAmount: won.reduce((sum, o) => sum + (o.Amount ?? 0), 0),
      openCount: open.length,
    };
  }, [opps]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data ? `${data.totalSize} opportunities` : "Loading opportunities from Salesforce..."}
        </p>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Pipeline</span>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(totalPipeline)}</p>
                <p className="text-xs text-muted-foreground mt-1">{openCount} open opportunities</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Weighted Pipeline</span>
                  <Target className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(weightedPipeline)}</p>
                <p className="text-xs text-muted-foreground mt-1">Based on probability</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Closed Won</span>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(wonAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {opps.filter((o) => o.StageName === "Closed Won").length} deals
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Failed to load opportunities from Salesforce. Please try refreshing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Opportunity</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Account</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Stage</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-right hidden lg:table-cell">Probability</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-right hidden sm:table-cell">Close Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No opportunities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((opp) => (
                      <TableRow key={opp.Id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{opp.Name}</p>
                            <p className="text-xs text-muted-foreground">{opp.Id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          {opp.Account?.Name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={stageColors[opp.StageName] ?? fallbackStageColor}>
                            {opp.StageName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          {opp.Amount != null ? formatCurrency(opp.Amount) : "—"}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={opp.Probability ?? 0} className="w-16 h-1.5" />
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {opp.Probability ?? 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-right text-muted-foreground hidden sm:table-cell">
                          {new Date(opp.CloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerOpportunities;
