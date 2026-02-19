import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, CheckCircle, XCircle, RefreshCw, Search, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface WorkflowLog {
  id: string;
  user_id: string;
  workflow_id: string;
  workflow_name: string;
  form_data: Record<string, string>;
  created_at: string;
  status: 'success' | 'failure';
  error_message: string | null;
  user_name: string | null;
  user_email: string | null;
}

const Logs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    checkIfSuperAdmin();
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLogs();
    }
  }, [isSuperAdmin]);

  const checkIfSuperAdmin = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();
    
    if (!data) {
      navigate('/');
      return;
    }
    
    setIsSuperAdmin(true);
  };

  const fetchLogs = async () => {
    try {
      // Fetch all workflow runs
      const { data: runs, error: runsError } = await supabase
        .from('workflow_runs')
        .select('*')
        .order('created_at', { ascending: false });

      if (runsError) throw runsError;

      // Fetch all profiles to get user names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (profilesError) throw profilesError;

      // Map profiles to a lookup
      const profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      profiles?.forEach(p => {
        profilesMap[p.id] = { full_name: p.full_name, email: p.email };
      });

      // Combine data
      const logsWithUsers: WorkflowLog[] = (runs || []).map(run => ({
        id: run.id,
        user_id: run.user_id,
        workflow_id: run.workflow_id,
        workflow_name: run.workflow_name,
        form_data: run.form_data as Record<string, string>,
        created_at: run.created_at,
        status: (run.status as 'success' | 'failure') || 'success',
        error_message: run.error_message || null,
        user_name: profilesMap[run.user_id]?.full_name || null,
        user_email: profilesMap[run.user_id]?.email || null
      }));

      setLogs(logsWithUsers);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "Failed to load logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (log: WorkflowLog) => {
    setRetryingId(log.id);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-workflow', {
        body: {
          workflowId: log.workflow_id,
          formData: log.form_data
        }
      });

      if (error) throw error;

      toast({
        title: "Workflow Triggered",
        description: `${log.workflow_name} has been re-triggered successfully.`
      });

      // Refresh logs after retry
      fetchLogs();
    } catch (error) {
      console.error('Error retrying workflow:', error);
      toast({
        title: "Error",
        description: "Failed to retry workflow. Check the console for details.",
        variant: "destructive"
      });
    } finally {
      setRetryingId(null);
    }
  };

  // Helper to get field value with multiple possible keys
  const getField = (formData: Record<string, string>, ...keys: string[]) => {
    for (const key of keys) {
      if (formData?.[key]) return formData[key];
    }
    return null;
  };

  // Filter logs based on search
  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      log.workflow_name.toLowerCase().includes(query) ||
      (log.user_name?.toLowerCase().includes(query) ?? false) ||
      (log.user_email?.toLowerCase().includes(query) ?? false) ||
      (getField(log.form_data, 'clientName', 'Client Name')?.toLowerCase().includes(query) ?? false) ||
      (getField(log.form_data, 'salesforceAccountId', 'Salesforce Account ID')?.toLowerCase().includes(query) ?? false) ||
      (getField(log.form_data, 'salesforceOpportunityId', 'Salesforce Opportunity ID', 'sfOpportunityId')?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <div className="flex-1 bg-gradient-to-b from-background to-muted/20">
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-page-title">Workflow Logs</CardTitle>
                <CardDescription>
                  All workflow executions across all users
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Filter */}
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by workflow, user, client, or Salesforce ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="outline" className="ml-auto">
                {filteredLogs.length} of {logs.length} logs
              </Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'No logs match your search' : 'No workflow logs found'}
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 hidden sm:table-cell">#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Retry</TableHead>
                      <TableHead className="hidden md:table-cell">Date/Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead className="hidden lg:table-cell">Client</TableHead>
                      <TableHead className="hidden xl:table-cell">SF Account ID</TableHead>
                      <TableHead className="hidden xl:table-cell">SF Opportunity ID</TableHead>
                      <TableHead className="hidden xl:table-cell">Other Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log, index) => {
                      const clientName = getField(log.form_data, 'clientName', 'Client Name');
                      const clientWebsite = getField(log.form_data, 'clientWebsite', 'Client Website');
                      const sfAccountId = getField(log.form_data, 'salesforceAccountId', 'Salesforce Account ID');
                      const sfOppId = getField(log.form_data, 'salesforceOpportunityId', 'Salesforce Opportunity ID', 'sfOpportunityId');
                      
                      // Fields to exclude from "Other Data"
                      const excludedFields = [
                        'clientName', 'Client Name', 
                        'clientWebsite', 'Client Website',
                        'salesforceAccountId', 'Salesforce Account ID',
                        'salesforceOpportunityId', 'Salesforce Opportunity ID', 'sfOpportunityId',
                        'yourEmail', 'Your Email',
                        'yourName', 'Your Name'
                      ];

                      const otherFields = Object.entries(log.form_data || {})
                        .filter(([key]) => !excludedFields.includes(key));

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground font-mono hidden sm:table-cell">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            {log.status === 'success' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Tooltip>
                                <TooltipTrigger>
                                  <XCircle className="h-5 w-5 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-[300px]">{log.error_message || 'Unknown error'}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={log.status === 'failure' ? 'destructive' : 'outline'}
                              size="sm"
                              onClick={() => handleRetry(log)}
                              disabled={retryingId === log.id}
                              className="text-xs h-7 px-2"
                            >
                              {retryingId === log.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Retry
                                </>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap text-sm hidden md:table-cell">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{log.user_name || 'Unknown'}</div>
                              <div className="text-muted-foreground text-xs">{log.user_email || '-'}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {log.workflow_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-sm">
                              <div className="font-medium">{clientName || '-'}</div>
                              {clientWebsite && (
                                <a 
                                  href={clientWebsite.startsWith('http') ? clientWebsite : `https://${clientWebsite}`}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-xs flex items-center gap-1"
                                >
                                  {clientWebsite}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {sfAccountId ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="font-mono text-xs max-w-[100px] truncate block">
                                    {sfAccountId.slice(0, 10)}...
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-mono">{sfAccountId}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {sfOppId ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="font-mono text-xs max-w-[100px] truncate block">
                                    {sfOppId.slice(0, 10)}...
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-mono">{sfOppId}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {otherFields.length > 0 ? (
                              <div className="max-w-[150px] text-xs text-muted-foreground">
                                {otherFields.slice(0, 2).map(([key, value]) => (
                                  <div key={key} className="truncate">
                                    <span className="font-medium">{key}:</span> {value || '-'}
                                  </div>
                                ))}
                                {otherFields.length > 2 && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className="text-primary cursor-pointer">+{otherFields.length - 2} more</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        {otherFields.slice(2).map(([key, value]) => (
                                          <div key={key}>
                                            <span className="font-medium">{key}:</span> {value || '-'}
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Logs;