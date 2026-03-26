import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, UserCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth, type PartnerType } from "@/hooks/useAuth";
import {
  useAdminUsers,
  useAdminPartners,
  useUpdateUserRole,
  type AdminUser,
} from "@/hooks/useAdmin";

type SortKey = "name" | "email" | "role" | "partner" | "created";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

const ROLES = ["user", "super_admin"] as const;

function getRoleColor(role: string) {
  switch (role) {
    case "super_admin":
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    default:
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "super_admin": return "Super Admin";
    default: return "User";
  }
}

function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
}

function getPrimaryRole(user: AdminUser): string {
  const roles = user.user_roles?.map((r) => r.role) ?? [];
  if (roles.includes("super_admin")) return "super_admin";
  return "user";
}

const AdminUsers = () => {
  useDocumentTitle("User Management");
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>(searchParams.get("partner") || "all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const navigate = useNavigate();
  const { startImpersonating } = useAuth();
  const { data: users, isLoading, isError, error } = useAdminUsers();
  const { data: partners } = useAdminPartners();
  const updateRole = useUpdateUserRole();
  const allUsers = users ?? [];

  const handleSearchChange = (value: string) => { setSearch(value); setPage(0); };
  const handleRoleFilterChange = (value: string) => { setRoleFilter(value); setPage(0); };
  const handlePartnerFilterChange = (value: string) => { setPartnerFilter(value); setPage(0); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const handleImpersonate = (u: AdminUser) => {
    const partnerType = (u.partners?.type as PartnerType) ?? null;
    startImpersonating({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      partnerType,
      sfdcAccountId: u.partners?.sfdc_account_id ?? null,
    });
    toast.success(`Impersonating ${u.full_name || u.email}`);
    window.scrollTo(0, 0);
    navigate("/", { replace: true });
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateRole.mutateAsync({ userId, role });
      toast.success("Role updated");
    } catch (err) {
      toast.error((err as Error).message || "Failed to update role");
    }
  };

  const filtered = useMemo(() => {
    return allUsers.filter((u) => {
      const matchesSearch =
        !search ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.partners?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || getPrimaryRole(u) === roleFilter;
      const matchesPartner = partnerFilter === "all" || u.partner_id === partnerFilter;
      return matchesSearch && matchesRole && matchesPartner;
    });
  }, [allUsers, search, roleFilter, partnerFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string | null;
      let bVal: string | null;
      switch (sortKey) {
        case "name": aVal = a.full_name; bVal = b.full_name; break;
        case "email": aVal = a.email; bVal = b.email; break;
        case "role": aVal = getPrimaryRole(a); bVal = getPrimaryRole(b); break;
        case "partner": aVal = a.partners?.name ?? null; bVal = b.partners?.name ?? null; break;
        case "created": aVal = a.created_at; bVal = b.created_at; break;
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
            placeholder="Search users..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={partnerFilter} onValueChange={handlePartnerFilterChange}>
          <SelectTrigger className="w-full sm:w-[200px] h-9">
            <SelectValue placeholder="Partner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Partners</SelectItem>
            {partners?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => navigate("/admin/users/new")}>
            <Plus className="h-4 w-4 mr-1" />
            Create User
          </Button>
          <Badge variant="secondary">
            {filtered.length === allUsers.length
              ? `${allUsers.length} users`
              : `${filtered.length} of ${allUsers.length} users`}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isError ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">Failed to load users</p>
              <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading users...</p>
            </div>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            No users found
          </div>
        ) : (
          <div className="w-full overflow-x-auto border-b">
            <Table className="table-fixed [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className={thClass} resizable onClick={() => handleSort("name")}>
                    <span className="inline-flex items-center">Name<SortIcon active={sortKey === "name"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} hidden md:table-cell`} resizable onClick={() => handleSort("email")}>
                    <span className="inline-flex items-center">Email<SortIcon active={sortKey === "email"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={thClass} resizable onClick={() => handleSort("role")}>
                    <span className="inline-flex items-center">Role<SortIcon active={sortKey === "role"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={thClass} resizable onClick={() => handleSort("partner")}>
                    <span className="inline-flex items-center">Partner<SortIcon active={sortKey === "partner"} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={`${thClass} hidden sm:table-cell`} resizable onClick={() => handleSort("created")}>
                    <span className="inline-flex items-center">Created<SortIcon active={sortKey === "created"} dir={sortDir} /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((u) => {
                  const role = getPrimaryRole(u);
                  return (
                    <TableRow key={u.id} className="hover:bg-muted/50 h-[52px]">
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleImpersonate(u)}
                                className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Impersonate</TooltipContent>
                          </Tooltip>
                          <span className="text-sm font-medium truncate">{u.full_name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{u.email}</span>
                      </TableCell>
                      <TableCell className="py-1">
                        <Select
                          value={role}
                          onValueChange={(val) => handleRoleChange(u.id, val)}
                        >
                          <SelectTrigger className="h-8 w-full sm:w-[140px] text-xs border-0 bg-transparent hover:bg-muted/50 shadow-none focus:ring-0">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleColor(role)}`}>
                              {getRoleLabel(role)}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-2">
                        {u.partners?.sfdc_account_id ? (
                          <a
                            href={`https://pendo.lightning.force.com/lightning/r/Account/${u.partners.sfdc_account_id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline truncate block"
                          >
                            {u.partners.name}
                          </a>
                        ) : (
                          <span className="text-sm">{u.partners?.name ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-border/50 px-3 sm:px-6 py-3 flex items-center justify-between bg-card/30">
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length} users
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

export default AdminUsers;
