import { useState, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminUsers,
  useAdminPartners,
  useUpdateUserRole,
  useAssignPartner,
  type AdminUser,
} from "@/hooks/useAdmin";

type SortKey = "name" | "email" | "role" | "partner" | "created";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

const ROLES = ["user", "editor", "super_admin"] as const;

function getRoleColor(role: string) {
  switch (role) {
    case "super_admin":
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    case "editor":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    default:
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "super_admin": return "Super Admin";
    case "editor": return "Editor";
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
  if (roles.includes("editor")) return "editor";
  return "user";
}

const AdminUsers = () => {
  useDocumentTitle("User Management");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPartnerId, setEditPartnerId] = useState<string>("");

  const { data: users, isLoading, isError, error } = useAdminUsers();
  const { data: partners } = useAdminPartners();
  const updateRole = useUpdateUserRole();
  const assignPartner = useAssignPartner();

  const allUsers = users ?? [];

  const handleSearchChange = (value: string) => { setSearch(value); setPage(0); };
  const handleRoleFilterChange = (value: string) => { setRoleFilter(value); setPage(0); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditRole(getPrimaryRole(user));
    setEditPartnerId(user.partner_id ?? "none");
  };

  const handleSave = async () => {
    if (!editUser) return;
    try {
      const currentRole = getPrimaryRole(editUser);
      if (editRole !== currentRole) {
        await updateRole.mutateAsync({ userId: editUser.id, role: editRole });
      }
      const newPartnerId = editPartnerId === "none" ? null : editPartnerId;
      if (newPartnerId !== editUser.partner_id) {
        await assignPartner.mutateAsync({ userId: editUser.id, partnerId: newPartnerId });
      }
      toast.success("User updated");
      setEditUser(null);
    } catch (err) {
      toast.error((err as Error).message || "Failed to update user");
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
      return matchesSearch && matchesRole;
    });
  }, [allUsers, search, roleFilter]);

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

        <Badge variant="secondary" className="ml-auto">
          {filtered.length === allUsers.length
            ? `${allUsers.length} users`
            : `${filtered.length} of ${allUsers.length} users`}
        </Badge>
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
                  <TableHead className={`${thClass} text-right hidden sm:table-cell`} resizable onClick={() => handleSort("created")}>
                    <span className="inline-flex items-center justify-end">Created<SortIcon active={sortKey === "created"} dir={sortDir} /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((u) => {
                  const role = getPrimaryRole(u);
                  return (
                    <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50 h-[52px]" onClick={() => openEdit(u)}>
                      <TableCell className="py-2">
                        <span className="text-sm font-medium">{u.full_name || "—"}</span>
                      </TableCell>
                      <TableCell className="py-2 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{u.email}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleColor(role)}`}>
                          {getRoleLabel(role)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm">{u.partners?.name ?? "—"}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right hidden sm:table-cell">
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

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-muted-foreground font-medium">Name</Label>
                <p className="text-sm mt-1">{editUser.full_name || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-medium">Email</Label>
                <p className="text-sm mt-1">{editUser.email}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Partner</Label>
                <Select value={editPartnerId} onValueChange={setEditPartnerId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Partner</SelectItem>
                    {partners?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={updateRole.isPending || assignPartner.isPending}
            >
              {(updateRole.isPending || assignPartner.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
