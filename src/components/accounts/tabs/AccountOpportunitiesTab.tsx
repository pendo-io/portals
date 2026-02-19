import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { useClariOpportunities } from "@/hooks/useClari";
import type { SFDCOpportunity } from "@/types/salesforce";
import { cn } from "@/lib/utils";

interface AccountOpportunitiesTabProps {
  opportunities: SFDCOpportunity[];
  loading: boolean;
}

function getStageColor(stage: string): string {
  if (stage === "Closed Won") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (stage === "Closed Lost") return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400";
  if (stage.includes("Negotiation") || stage.includes("Review") || stage.includes("Proposal"))
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  if (stage.includes("Qualification") || stage.includes("Discovery") || stage.includes("Prospecting"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400";
}

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (score >= 40) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400";
}

type SortField = "name" | "stage" | "amount" | "score" | "closeDate" | "owner";
type SortDirection = "asc" | "desc";

export function AccountOpportunitiesTab({ opportunities, loading }: AccountOpportunitiesTabProps) {
  const [sortField, setSortField] = useState<SortField>("closeDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sfdcOppIds = useMemo(() => opportunities.map((o) => o.Id), [opportunities]);
  const { data: clariOpps } = useClariOpportunities(sfdcOppIds);

  const clariScoreMap = useMemo(() => {
    const map = new Map<string, number | null>();
    if (clariOpps) {
      for (const co of clariOpps) {
        map.set(co.oppId, co.clariScore);
      }
    }
    return map;
  }, [clariOpps]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedOpps = useMemo(() => {
    return [...opportunities].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.Name.localeCompare(b.Name);
          break;
        case "stage":
          cmp = a.StageName.localeCompare(b.StageName);
          break;
        case "amount":
          cmp = (a.Amount ?? 0) - (b.Amount ?? 0);
          break;
        case "score": {
          const sa = clariScoreMap.get(a.Id) ?? -1;
          const sb = clariScoreMap.get(b.Id) ?? -1;
          cmp = sa - sb;
          break;
        }
        case "closeDate":
          cmp = new Date(a.CloseDate).getTime() - new Date(b.CloseDate).getTime();
          break;
        case "owner":
          cmp = (a.Owner?.Name || "").localeCompare(b.Owner?.Name || "");
          break;
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });
  }, [opportunities, sortField, sortDirection, clariScoreMap]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 inline-block ml-1" />
      : <ArrowDown className="h-3 w-3 inline-block ml-1" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No opportunities found for this account
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border-b">
      <Table className="[&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("name")}
            >
              Opportunity<SortIcon field="name" />
            </TableHead>
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("stage")}
            >
              Stage<SortIcon field="stage" />
            </TableHead>
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider text-right cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("amount")}
            >
              Amount<SortIcon field="amount" />
            </TableHead>
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("score")}
            >
              Deal Score<SortIcon field="score" />
            </TableHead>
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("closeDate")}
            >
              Close Date<SortIcon field="closeDate" />
            </TableHead>
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground hidden md:table-cell"
              onClick={() => handleSort("owner")}
            >
              Owner<SortIcon field="owner" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOpps.map((opp) => {
            const score = clariScoreMap.get(opp.Id);
            return (
              <TableRow
                key={opp.Id}
                className="cursor-pointer hover:bg-muted/50 h-[52px]"
                onClick={() => window.open(`https://pendo--full.sandbox.lightning.force.com/${opp.Id}`, "_blank")}
              >
                <TableCell className="py-2">
                  <p className="font-medium text-sm leading-tight truncate max-w-[280px]">{opp.Name}</p>
                </TableCell>
                <TableCell className="py-2">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", getStageColor(opp.StageName))}>
                    {opp.StageName}
                  </span>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <span className="text-sm font-medium tabular-nums">
                    {opp.Amount != null ? `$${opp.Amount.toLocaleString()}` : "-"}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  {score != null ? (
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", getScoreColor(score))}>
                      {score}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {new Date(opp.CloseDate).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell className="py-2 hidden md:table-cell">
                  <span className="text-sm truncate block max-w-[120px]">{opp.Owner?.Name || "-"}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
