import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountLogo } from "@/components/accounts/AccountLogo";
import { ArrowUp, ArrowDown, ArrowUpDown, Check, ExternalLink, Flame, UserCheck, Globe, Target, TrendingUp, UserPlus, Newspaper, Zap } from "lucide-react";
import type { Signal } from "@/data/mockSignals";

export type SignalSortKey = "signal" | "type" | "source" | "date";
export type SortDir = "asc" | "desc";

const SIGNAL_CONFIG: Record<string, { icon: typeof Flame; color: string; label: string }> = {
  "6sense New Hot Account": { icon: Flame, color: "text-red-500 bg-red-500/10", label: "Hot Account" },
  "Sixth Sense Contact Engagement": { icon: UserCheck, color: "text-blue-500 bg-blue-500/10", label: "Contact Engagement" },
  "Sixth Sense Recent Web Visits": { icon: Globe, color: "text-blue-500 bg-blue-500/10", label: "Web Visits" },
  "Sixth Sense Recent Intent Activities": { icon: Target, color: "text-purple-500 bg-purple-500/10", label: "Intent Activity" },
  "Job Postings - Growth Flag": { icon: TrendingUp, color: "text-green-500 bg-green-500/10", label: "Growth Flag" },
  "Hiring": { icon: UserPlus, color: "text-teal-500 bg-teal-500/10", label: "Senior Hire" },
  "News": { icon: Newspaper, color: "text-yellow-500 bg-yellow-500/10", label: "News" },
  "Fundraising": { icon: Newspaper, color: "text-yellow-500 bg-yellow-500/10", label: "Fundraising" },
  "Product Release": { icon: Newspaper, color: "text-yellow-500 bg-yellow-500/10", label: "Product Release" },
  "Qualified Signals Engagement": { icon: Zap, color: "text-purple-500 bg-purple-500/10", label: "Qualified Signal" },
};

function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
}

interface SignalsTableProps {
  signals: Signal[];
  onDismiss?: (id: string) => void;
  dismissedIds?: Set<string>;
  sortKey?: SignalSortKey;
  sortDir?: SortDir;
  onSort?: (key: SignalSortKey) => void;
}

export function SignalsTable({ signals, onDismiss, dismissedIds, sortKey, sortDir, onSort }: SignalsTableProps) {
  const navigate = useNavigate();

  if (signals.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No signals found
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border-b">
      <Table className="[&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {onDismiss && <TableHead className="w-[40px]" />}
            <TableHead className={`font-semibold text-xs uppercase tracking-wider ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("signal")}>
              <span className="inline-flex items-center">Signal{onSort && <SortIcon active={sortKey === "signal"} dir={sortDir} />}</span>
            </TableHead>
            <TableHead className={`font-semibold text-xs uppercase tracking-wider ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("type")}>
              <span className="inline-flex items-center">Type{onSort && <SortIcon active={sortKey === "type"} dir={sortDir} />}</span>
            </TableHead>
            <TableHead className={`font-semibold text-xs uppercase tracking-wider hidden sm:table-cell ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("source")}>
              <span className="inline-flex items-center">Source{onSort && <SortIcon active={sortKey === "source"} dir={sortDir} />}</span>
            </TableHead>
            <TableHead className={`font-semibold text-xs uppercase tracking-wider hidden lg:table-cell ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("date")}>
              <span className="inline-flex items-center">Date{onSort && <SortIcon active={sortKey === "date"} dir={sortDir} />}</span>
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider w-[60px]">Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signals.map((signal) => {
            const config = SIGNAL_CONFIG[signal.signalType] || { icon: Zap, color: "text-muted-foreground bg-muted", label: signal.signalType };
            const Icon = config.icon;

            return (
              <TableRow
                key={signal.id}
                className="cursor-pointer hover:bg-muted/50 h-[52px]"
                onClick={() => signal.accountId && navigate(`/accounts/${signal.accountId}`)}
              >
                {onDismiss && (
                  <TableCell className="py-2 w-[40px]">
                    {(() => {
                      const isDismissed = dismissedIds?.has(signal.id);
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(signal.id);
                          }}
                          className={`flex items-center justify-center h-5 w-5 rounded border transition-colors ${
                            isDismissed
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          }`}
                          title={isDismissed ? "Restore signal" : "Dismiss signal"}
                        >
                          <Check className={`h-3 w-3 ${isDismissed ? "opacity-100" : "opacity-0"}`} />
                        </button>
                      );
                    })()}
                  </TableCell>
                )}
                <TableCell className="py-2">
                  <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
                    <AccountLogo domain={signal.accountDomain} name={signal.accountName} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">
                        {signal.contactName ? signal.contactTitle : signal.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {signal.contactName || `People at ${signal.accountName}`}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </span>
                </TableCell>
                <TableCell className="py-2 hidden sm:table-cell">
                  <span className="text-sm">{signal.source}</span>
                </TableCell>
                <TableCell className="py-2 hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(signal.publishDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {signal.linkedinUrl && (
                      <a
                        href={signal.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 p-1"
                        title="LinkedIn"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
