import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePortalType } from "@/hooks/usePortalType";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useSfdcLeads } from "@/hooks/useSfdcLeads";

type SortKey = "company" | "contact" | "email" | "status" | "source" | "created";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

function statusColor(status: string): string {
  switch (status) {
    case "New":         return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
    case "Working":     return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
    case "Qualified":   return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
    case "Unqualified": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
    case "Converted":   return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400";
    default:            return "bg-muted text-muted-foreground";
  }
}

function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
}

const PartnerLeads = () => {
  useDocumentTitle("Leads");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const navigate = useNavigate();
  const { basePath, t } = usePortalType();
  const { data, isLoading, isError, error, refetch } = useSfdcLeads();

  const leads = data?.records ?? [];

  const statuses = useMemo(() => {
    return [...new Set(leads.map((l) => l.Status))].filter(Boolean).sort();
  }, [leads]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
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
    return leads.filter((lead) => {
      const matchesSearch =
        !search ||
        lead.Company?.toLowerCase().includes(search.toLowerCase()) ||
        lead.Name?.toLowerCase().includes(search.toLowerCase()) ||
        lead.Email?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || lead.Status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;
      switch (sortKey) {
        case "company": aVal = a.Company; bVal = b.Company; break;
        case "contact": aVal = a.Name; bVal = b.Name; break;
        case "email": aVal = a.Email; bVal = b.Email; break;
        case "status": aVal = a.Status; bVal = b.Status; break;
        case "source": aVal = a.LeadSource; bVal = b.LeadSource; break;
        case "created": aVal = a.CreatedDate; bVal = b.CreatedDate; break;
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

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
            placeholder={t("Search leads...")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All Statuses")}</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="ml-auto">
          {filtered.length === leads.length
            ? `${leads.length} leads`
            : `${filtered.length} of ${leads.length} leads`}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isError ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <p className="text-destructive font-medium">{t("Failed to load leads")}</p>
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
              <p className="text-sm text-muted-foreground">{t("Loading leads...")}</p>
            </div>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            {t("No leads found")}
          </div>
        ) : (
          <div className="w-full overflow-x-auto border-b">
            <Table className="table-fixed [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className={thClass} style={{ width: "20%" }} resizable onClick={() => handleSort("contact")}>
                    <span className="inline-flex items-center">Name<SortIcon active={sortKey === "contact"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} hidden md:table-cell`} style={{ width: "26%" }} resizable onClick={() => handleSort("email")}>
                    <span className="inline-flex items-center">Email<SortIcon active={sortKey === "email"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={thClass} style={{ width: "20%" }} resizable onClick={() => handleSort("company")}>
                    <span className="inline-flex items-center">Company<SortIcon active={sortKey === "company"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={thClass} style={{ width: "14%" }} resizable onClick={() => handleSort("status")}>
                    <span className="inline-flex items-center">Status<SortIcon active={sortKey === "status"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} hidden sm:table-cell`} style={{ width: "170px" }} resizable onClick={() => handleSort("created")}>
                    <span className="inline-flex items-center">Created Date<SortIcon active={sortKey === "created"} dir={sortDir} /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((lead) => (
                  <TableRow key={lead.Id} className="cursor-pointer hover:bg-muted/50 h-[52px]" onClick={() => navigate(`${basePath}/leads/${lead.Id}`)}>
                    <TableCell className="py-2 max-w-[160px] sm:max-w-none">
                      <span className="text-sm font-medium truncate block">{lead.Name}</span>
                    </TableCell>
                    <TableCell className="py-2 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground truncate block">{lead.Email ?? "—"}</span>
                    </TableCell>
                    <TableCell className="py-2 max-w-[140px] sm:max-w-none">
                      <span className="text-sm truncate block">{lead.Company}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      {lead.Status ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(lead.Status)}`}>
                          {lead.Status}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {new Date(lead.CreatedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </TableCell>
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
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length} leads
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
    </div>
  );
};

export default PartnerLeads;
