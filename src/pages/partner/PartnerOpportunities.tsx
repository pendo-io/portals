import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePortalType } from "@/hooks/usePortalType";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Info, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSfdcOpportunities } from "@/hooks/useSfdcOpportunities";
import { useAuth } from "@/hooks/useAuth";

type SortKey = "name" | "account" | "stage" | "amount" | "arr" | "probability" | "closeDate";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

const formatCurrency = (value: number | null): string => {
  if (value == null) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

function stageColor(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes("closed/won") || s.includes("closed won") || s.includes("6: closed/won")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
  if (s.includes("closed/lost") || s.includes("closed lost"))          return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  if (s.includes("disqualif"))                                          return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  if (s.includes("negotiat") || s.includes("contract") || s === "stage 3") return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400";
  if (s.includes("proposal") || s.includes("value prop") || s.includes("shortlist") || s === "stage 2") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  if (s.includes("discover") || s.includes("needs") || s.includes("pilot") || s === "stage 1") return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400";
  if (s.includes("qualif") || s.includes("prospect") || s.includes("decision") || s === "stage 0") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
  if (/stage \d+/.test(s)) return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
  return "bg-muted text-muted-foreground";
}

function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
}

const PartnerOpportunities = () => {
  useDocumentTitle("Opportunities");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const navigate = useNavigate();
  const { basePath, t } = usePortalType();
  const { isSuperAdmin } = useAuth();
  const { data, isLoading, isError, error, refetch } = useSfdcOpportunities();

  const opps = data?.records ?? [];

  const stages = useMemo(() => {
    return [...new Set(opps.map((o) => o.StageName))].filter(Boolean).sort();
  }, [opps]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleStageFilterChange = (value: string) => {
    setStageFilter(value);
    setPage(0);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const filtered = useMemo(() => {
    return opps.filter((opp) => {
      const matchesSearch =
        !search ||
        opp.Name?.toLowerCase().includes(search.toLowerCase()) ||
        opp.Account?.Name?.toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === "all" || opp.StageName === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [opps, search, stageFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;
      switch (sortKey) {
        case "name": aVal = a.Name; bVal = b.Name; break;
        case "account": aVal = a.Account?.Name ?? null; bVal = b.Account?.Name ?? null; break;
        case "stage": aVal = a.StageName; bVal = b.StageName; break;
        case "amount": aVal = a.Amount; bVal = b.Amount; break;
        case "arr": aVal = a.ARR__c; bVal = b.ARR__c; break;
        case "probability": aVal = a.Probability; bVal = b.Probability; break;
        case "closeDate": aVal = a.CloseDate; bVal = b.CloseDate; break;
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalARR = filtered.reduce((sum, o) => sum + (o.ARR__c ?? 0), 0);
  const totalTCV = filtered.reduce((sum, o) => sum + (o.Amount ?? 0), 0);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const thClass = "font-semibold text-xs uppercase tracking-wider cursor-pointer select-none";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="border-b px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("Search opportunities...")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={stageFilter} onValueChange={handleStageFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All Stages")}</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            {filtered.length === opps.length
              ? `${opps.length} opportunities`
              : `${filtered.length} of ${opps.length} opportunities`}
          </Badge>
          <Badge variant="secondary">ARR {formatCurrency(totalARR)}</Badge>
          <Badge variant="secondary">TCV {formatCurrency(totalTCV)}</Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-default shrink-0" />
            </TooltipTrigger>
            <TooltipContent>Partner referral fees are paid on eligible year 1 ARR only</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isError ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <p className="text-destructive font-medium">{t("Failed to load opportunities")}</p>
              <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Something went wrong."}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("Loading opportunities...")}</p>
            </div>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            {t("No opportunities found")}
          </div>
        ) : (
          <div className="w-full overflow-x-auto border-b">
            <Table className="table-fixed [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className={thClass} style={{ width: "34%" }} resizable onClick={() => handleSort("name")}>
                    <span className="inline-flex items-center">Opportunity Name<SortIcon active={sortKey === "name"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} hidden md:table-cell`} style={{ width: "16%" }} resizable onClick={() => handleSort("account")}>
                    <span className="inline-flex items-center">Account Name<SortIcon active={sortKey === "account"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={thClass} style={{ width: "14%" }} resizable onClick={() => handleSort("stage")}>
                    <span className="inline-flex items-center">Stage<SortIcon active={sortKey === "stage"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} hidden sm:table-cell`} style={{ width: "110px" }} resizable onClick={() => handleSort("closeDate")}>
                    <span className="inline-flex items-center">Close Date<SortIcon active={sortKey === "closeDate"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} text-right hidden sm:table-cell`} style={{ width: "75px" }} resizable onClick={() => handleSort("arr")}>
                    <span className="inline-flex items-center justify-end">ARR<SortIcon active={sortKey === "arr"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} text-right`} style={{ width: "75px" }} resizable onClick={() => handleSort("amount")}>
                    <span className="inline-flex items-center justify-end">TCV<SortIcon active={sortKey === "amount"} dir={sortDir} /></span>
                  </TableHead>
                  {isSuperAdmin && (
                    <TableHead className={`${thClass} hidden lg:table-cell`} style={{ width: "160px" }}>
                      <span className="inline-flex items-center gap-1.5">
                        Partner Account
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-normal normal-case tracking-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded px-1 py-0.5">
                          <Lock className="h-2.5 w-2.5" />Admin
                        </span>
                      </span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((opp) => (
                  <TableRow key={opp.Id} className="cursor-pointer hover:bg-muted/50 h-[52px]" onClick={() => navigate(`${basePath}/opportunities/${opp.Id}`)}>
                    <TableCell className="py-2">
                      <p className="font-medium text-sm leading-tight truncate min-w-[140px] sm:min-w-[180px]">{opp.Name}</p>
                    </TableCell>
                    <TableCell className="py-2 hidden md:table-cell">
                      <span className="text-sm">{opp.Account?.Name ?? "—"}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      {opp.StageName ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageColor(opp.StageName)}`}>
                          {opp.StageName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {new Date(opp.CloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-right hidden sm:table-cell">
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(opp.ARR__c)}</span>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(opp.Amount)}</span>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="py-2 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground truncate block">
                          {opp.PartnerAccount?.Name ?? "—"}
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-border/50 px-3 sm:px-6 py-3 flex items-center justify-between bg-card/30">
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length} opportunities
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Page {page + 1} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerOpportunities;
