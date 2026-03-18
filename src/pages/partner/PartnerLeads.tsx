import { useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, Filter } from "lucide-react";
import { useSfdcLeads } from "@/hooks/useSfdcLeads";

const statusColors: Record<string, string> = {
  "Open - Not Contacted": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "Working - Contacted": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Closed - Converted": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "Closed - Not Converted": "bg-red-500/10 text-red-700 dark:text-red-400",
  New: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Contacted: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Qualified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Nurturing: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Disqualified: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const fallbackStatusColor = "bg-gray-500/10 text-gray-700 dark:text-gray-400";

const PartnerLeads = () => {
  useDocumentTitle("Leads");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data, isLoading, isError } = useSfdcLeads();

  const leads = data?.records ?? [];

  // Collect unique statuses for the filter dropdown
  const statuses = [...new Set(leads.map((l) => l.Status))].sort();

  const filtered = leads.filter((lead) => {
    const matchesSearch =
      lead.Company?.toLowerCase().includes(search.toLowerCase()) ||
      lead.Name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.Email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.Status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data ? `${data.totalSize} leads` : "Loading leads from Salesforce..."}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
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
              Failed to load leads from Salesforce. Please try refreshing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Company</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Email</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Source</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-right hidden sm:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((lead) => (
                      <TableRow key={lead.Id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{lead.Company}</p>
                            <p className="text-xs text-muted-foreground">{lead.Id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{lead.Name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          {lead.Email ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[lead.Status] ?? fallbackStatusColor}>
                            {lead.Status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">{lead.LeadSource ?? "—"}</TableCell>
                        <TableCell className="text-sm text-right text-muted-foreground hidden sm:table-cell">
                          {new Date(lead.CreatedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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

export default PartnerLeads;
