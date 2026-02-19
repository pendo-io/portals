import { useState, useMemo } from "react";
import { SignalsToolbar } from "@/components/signals/SignalsToolbar";
import { SignalsTable } from "@/components/signals/SignalsTable";
import type { SignalSortKey, SortDir } from "@/components/signals/SignalsTable";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Signal } from "@/data/mockSignals";
import { useAccounts } from "@/hooks/useAccounts";
import { useMySignals } from "@/hooks/useMySignals";
import { useDismissedSignals } from "@/hooks/useDismissedSignals";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
const PAGE_SIZE = 20;

export default function Signals() {
  const [search, setSearch] = useState("");
  const [signalTypeFilter, setSignalTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SignalSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showDismissed, setShowDismissed] = useState(false);

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const allSignals = useMySignals(accounts);
  const { dismissedIds, dismissSignal, restoreSignal } = useDismissedSignals();

  const dismissedCount = useMemo(
    () => allSignals.filter((s) => dismissedIds.has(s.id)).length,
    [allSignals, dismissedIds],
  );

  const signals = useMemo(
    () => showDismissed ? allSignals : allSignals.filter((s) => !dismissedIds.has(s.id)),
    [allSignals, dismissedIds, showDismissed],
  );

  const signalTypes = useMemo(() => {
    const set = new Set(signals.map((s) => s.signalType));
    return [...set].sort();
  }, [signals]);

  const sources = useMemo(() => {
    const set = new Set(signals.map((s) => s.source));
    return [...set].sort();
  }, [signals]);

  const filtered = useMemo(() => {
    return signals.filter((s: Signal) => {
      const matchesSearch =
        !search ||
        s.accountName.toLowerCase().includes(search.toLowerCase()) ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.signalType.toLowerCase().includes(search.toLowerCase());
      const matchesType = signalTypeFilter === "all" || s.signalType === signalTypeFilter;
      const matchesSource = sourceFilter === "all" || s.source === sourceFilter;
      return matchesSearch && matchesType && matchesSource;
    });
  }, [signals, search, signalTypeFilter, sourceFilter]);

  const handleSort = (key: SignalSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string;
      let bVal: string;
      switch (sortKey) {
        case "signal": aVal = a.accountName; bVal = b.accountName; break;
        case "type": aVal = a.signalType; bVal = b.signalType; break;
        case "source": aVal = a.source; bVal = b.source; break;
        case "date": aVal = a.publishDate; bVal = b.publishDate; break;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleTypeFilterChange = (value: string) => {
    setSignalTypeFilter(value);
    setPage(0);
  };

  const handleSourceFilterChange = (value: string) => {
    setSourceFilter(value);
    setPage(0);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <SignalsToolbar
        search={search}
        onSearchChange={handleSearchChange}
        signalTypeFilter={signalTypeFilter}
        onSignalTypeFilterChange={handleTypeFilterChange}
        sourceFilter={sourceFilter}
        onSourceFilterChange={handleSourceFilterChange}
        signalTypes={signalTypes}
        sources={sources}
        totalCount={signals.length}
        filteredCount={filtered.length}
        showDismissed={showDismissed}
        onShowDismissedChange={(v) => { setShowDismissed(v); setPage(0); }}
        dismissedCount={dismissedCount}
      />
      <div className="flex-1 overflow-auto">
        {accountsLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading signals...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Radio className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No signals found matching your filters.</p>
          </div>
        ) : (
          <SignalsTable
            signals={paginated}
            onDismiss={(id) => dismissedIds.has(id) ? restoreSignal(id) : dismissSignal(id)}
            dismissedIds={showDismissed ? dismissedIds : undefined}
            sortKey={sortKey ?? undefined}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}
      </div>
      {totalPages > 1 && (
        <div className="border-t border-border/50 px-3 sm:px-6 py-3 flex items-center justify-between bg-card/30">
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {DEV_BYPASS && (
        <div className="sticky bottom-0 border-t border-border/50 px-3 sm:px-6 py-2 text-center bg-background">
          <p className="text-xs text-muted-foreground">Using mock signal data in dev mode</p>
        </div>
      )}
    </div>
  );
}
