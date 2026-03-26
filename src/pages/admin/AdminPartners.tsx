import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
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
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  useAdminPartners,
} from "@/hooks/useAdmin";
import { useSfdcUserNames } from "@/hooks/useSfdcUserNames";

type SortKey = "name" | "type" | "owner" | "created";
type SortDir = "asc" | "desc";

const PARTNER_TYPES = ["partner", "oem", "japan"] as const;

function getTypeColor(type: string) {
  switch (type) {
    case "oem":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "japan":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
    default:
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "oem": return "OEM";
    case "japan": return "Japan";
    default: return "Partner";
  }
}

function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
}

const AdminPartners = () => {
  useDocumentTitle("Partner Management");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const navigate = useNavigate();
  const { data: partners, isLoading, isError, error } = useAdminPartners();

  const allPartners = partners ?? [];
  const ownerIds = useMemo(() => allPartners.map((p) => p.owner_id).filter(Boolean) as string[], [allPartners]);
  const { data: ownerNames } = useSfdcUserNames(ownerIds);

  const handleSearchChange = (value: string) => { setSearch(value); };
  const handleTypeFilterChange = (value: string) => { setTypeFilter(value); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    return allPartners.filter((p) => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [allPartners, search, typeFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string;
      let bVal: string;
      switch (sortKey) {
        case "name": aVal = a.name; bVal = b.name; break;
        case "type": aVal = a.type; bVal = b.type; break;
        case "owner": aVal = (a.owner_id && ownerNames?.get(a.owner_id)) || ""; bVal = (b.owner_id && ownerNames?.get(b.owner_id)) || ""; break;
        case "created": aVal = a.created_at; bVal = b.created_at; break;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const thClass = "font-semibold text-xs uppercase tracking-wider cursor-pointer select-none";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="border-b px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search partners..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PARTNER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="ml-auto">
          {filtered.length === allPartners.length
            ? `${allPartners.length} partners`
            : `${filtered.length} of ${allPartners.length} partners`}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isError ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">Failed to load partners</p>
              <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading partners...</p>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            No partners found
          </div>
        ) : (
          <div className="w-full overflow-x-auto border-b">
            <Table className="table-fixed [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className={thClass} resizable onClick={() => handleSort("name")}>
                    <span className="inline-flex items-center">Name<SortIcon active={sortKey === "name"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} hidden sm:table-cell`} resizable>
                    <span className="inline-flex items-center">SFDC Account</span>
                  </TableHead>
                  <TableHead className={thClass} resizable onClick={() => handleSort("type")}>
                    <span className="inline-flex items-center">Type<SortIcon active={sortKey === "type"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} hidden lg:table-cell`} resizable onClick={() => handleSort("owner")}>
                    <span className="inline-flex items-center">Owner<SortIcon active={sortKey === "owner"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} hidden sm:table-cell`} resizable onClick={() => handleSort("created")}>
                    <span className="inline-flex items-center">Created<SortIcon active={sortKey === "created"} dir={sortDir} /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/50 h-[52px]">
                    <TableCell className="py-2">
                      <button
                        className="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
                        onClick={() => navigate(`/admin/users?partner=${p.id}`)}
                      >
                        {p.name}
                      </button>
                    </TableCell>
                    <TableCell className="py-2 hidden sm:table-cell">
                      {p.sfdc_account_id ? (
                        <a
                          href={`https://pendo.lightning.force.com/lightning/r/Account/${p.sfdc_account_id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-primary hover:underline"
                        >
                          {p.sfdc_account_id}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(p.type)}`}>
                        {getTypeLabel(p.type)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 hidden lg:table-cell">
                      <span className="text-sm">{(p.owner_id && ownerNames?.get(p.owner_id)) || "—"}</span>
                    </TableCell>
                    <TableCell className="py-2 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminPartners;
