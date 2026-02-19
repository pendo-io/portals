import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2, Search, RefreshCw, Clock, User, Globe, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  user_id: string;
  api_name: string;
  action: string;
  request_params: Record<string, any> | null;
  response_status: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export default function AuditLogs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiFilter, setApiFilter] = useState<string>("all");
  const [uniqueApis, setUniqueApis] = useState<string[]>([]);

  useEffect(() => {
    checkAccess();
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLogs();
    }
  }, [isSuperAdmin]);

  const checkAccess = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!data) {
      navigate("/accounts");
      return;
    }

    setIsSuperAdmin(true);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch audit logs
      const { data: logsData, error: logsError } = await supabase
        .from("api_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      // Fetch profiles to get user names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedLogs: AuditLogEntry[] = (logsData || []).map(log => {
        const profile = profileMap.get(log.user_id);
        return {
          ...log,
          request_params: log.request_params as Record<string, any> | null,
          user_email: profile?.email || undefined,
          user_name: profile?.full_name || undefined,
        };
      });

      setLogs(enrichedLogs);

      // Extract unique API names for filter
      const apis = [...new Set(enrichedLogs.map(l => l.api_name))].sort();
      setUniqueApis(apis);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      searchQuery === "" ||
      log.api_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesApi = apiFilter === "all" || log.api_name === apiFilter;

    return matchesSearch && matchesApi;
  });

  const getStatusBadge = (status: number | null) => {
    if (!status) return <Badge variant="outline">N/A</Badge>;
    if (status >= 200 && status < 300) {
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">{status}</Badge>;
    }
    if (status >= 400 && status < 500) {
      return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">{status}</Badge>;
    }
    if (status >= 500) {
      return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">{status}</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-background to-muted/20">
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-page-title">Audit Logs</CardTitle>
                  <CardDescription>
                    View all API calls and system activity
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by API, action, or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={apiFilter} onValueChange={setApiFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by API" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All APIs</SelectItem>
                  {uniqueApis.map(api => (
                    <SelectItem key={api} value={api}>{api}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="ml-auto">
                {filteredLogs.length} of {logs.length} entries
              </Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery || apiFilter !== "all" ? "No logs match your filters" : "No audit logs found"}
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[180px]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Timestamp
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          User
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5" />
                          API / Action
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5" />
                          IP Address
                        </div>
                      </TableHead>
                      <TableHead>Parameters</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{log.user_name || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">{log.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit">{log.api_name}</Badge>
                            <span className="text-xs text-muted-foreground">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.response_status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {log.ip_address || "-"}
                        </TableCell>
                        <TableCell>
                          {log.request_params && Object.keys(log.request_params).length > 0 ? (
                            <div className="max-w-[200px] text-xs">
                              {Object.entries(log.request_params).slice(0, 3).map(([key, value]) => (
                                <div key={key} className="truncate">
                                  <span className="text-muted-foreground">{key}:</span>{" "}
                                  <span>{String(value).slice(0, 30)}</span>
                                </div>
                              ))}
                              {Object.keys(log.request_params).length > 3 && (
                                <span className="text-muted-foreground">+{Object.keys(log.request_params).length - 3} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
