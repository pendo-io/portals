import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users as UsersIcon, Shield, Loader2, History, CheckCircle, XCircle, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useImpersonation } from "@/contexts/ImpersonationContext";

type AppRole = 'user' | 'editor' | 'super_admin';

interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login: string | null;
  role: AppRole;
  workflow_run_count: number;
}

interface WorkflowRun {
  id: string;
  workflow_id: string;
  workflow_name: string;
  form_data: Record<string, string>;
  created_at: string;
  status: 'success' | 'failure';
  error_message: string | null;
}

const Users = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { startImpersonation } = useImpersonation();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedUserForLogs, setSelectedUserForLogs] = useState<UserWithRole | null>(null);
  const [userWorkflowRuns, setUserWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkIfSuperAdmin();
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
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
    // Don't set loading to false here - let fetchUsers handle it
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch workflow run counts for all users
      const { data: workflowRuns, error: runsError } = await supabase
        .from('workflow_runs')
        .select('user_id');

      if (runsError) throw runsError;

      // Count runs per user
      const runCounts: Record<string, number> = {};
      workflowRuns?.forEach(run => {
        runCounts[run.user_id] = (runCounts[run.user_id] || 0) + 1;
      });

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          last_login: profile.last_login,
          role: (userRole?.role as AppRole) || 'user',
          workflow_run_count: runCounts[profile.id] || 0
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserWorkflowRuns = async (userId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserWorkflowRuns(data?.map(run => ({
        id: run.id,
        workflow_id: run.workflow_id,
        workflow_name: run.workflow_name,
        form_data: run.form_data as Record<string, string>,
        created_at: run.created_at,
        status: (run.status as 'success' | 'failure') || 'success',
        error_message: run.error_message || null
      })) || []);
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
      toast({
        title: "Error",
        description: "Failed to load workflow runs",
        variant: "destructive"
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleViewLogs = (userItem: UserWithRole) => {
    setSelectedUserForLogs(userItem);
    fetchUserWorkflowRuns(userItem.id);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!isSuperAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only super admins can change user roles",
        variant: "destructive"
      });
      return;
    }

    setUpdatingUserId(userId);

    try {
      // First, delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole.replace('_', ' ')}`
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role. Make sure you have super admin permissions.",
        variant: "destructive"
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'editor':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Filter users based on search query
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      (u.full_name?.toLowerCase().includes(query) ?? false) ||
      (u.email?.toLowerCase().includes(query) ?? false) ||
      u.role.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex-1 bg-gradient-to-b from-background to-muted/20">
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <UsersIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-page-title">User Management</CardTitle>
                <CardDescription>
                  View all users and manage their roles
                </CardDescription>
                {isSuperAdmin && (
                  <div className="mt-2">
                    <Badge variant="destructive" className="inline-flex items-center">
                      <Shield className="h-3 w-3 mr-1" />
                      Super Admin
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Filter */}
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="outline" className="ml-auto">
                {filteredUsers.length} of {users.length} users
              </Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'No users match your search' : 'No users found'}
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 hidden sm:table-cell">#</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Joined</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                      <TableHead className="hidden sm:table-cell">Workflows Run</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userItem, index) => (
                      <TableRow key={userItem.id}>
                        <TableCell className="text-muted-foreground font-mono hidden sm:table-cell">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                              <AvatarImage src={userItem.avatar_url || undefined} />
                              <AvatarFallback>
                                {getInitials(userItem.full_name, userItem.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-medium block truncate">
                                {userItem.full_name || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground block truncate md:hidden">
                                {userItem.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">
                          {userItem.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                          {new Date(userItem.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                          {userItem.last_login
                            ? new Date(userItem.last_login).toLocaleString()
                            : 'Never'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{userItem.workflow_run_count}</Badge>
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <Select
                              value={userItem.role}
                              onValueChange={(value: AppRole) => handleRoleChange(userItem.id, value)}
                              disabled={updatingUserId === userItem.id}
                            >
                              <SelectTrigger className="w-[110px] sm:w-[140px]">
                                {updatingUserId === userItem.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={getRoleBadgeVariant(userItem.role)}>
                              {userItem.role.replace('_', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    startImpersonation({
                                      id: userItem.id,
                                      email: userItem.email || "",
                                      full_name: userItem.full_name,
                                    });
                                    navigate("/accounts");
                                    toast({
                                      title: "Impersonation Started",
                                      description: `Viewing as ${userItem.full_name || userItem.email}`,
                                    });
                                  }}
                                  disabled={userItem.id === user?.id}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {userItem.id === user?.id ? "Can't impersonate yourself" : "Impersonate user"}
                              </TooltipContent>
                            </Tooltip>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewLogs(userItem)}
                            >
                              <History className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Logs</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Workflow Runs Dialog */}
      <Dialog open={!!selectedUserForLogs} onOpenChange={() => setSelectedUserForLogs(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Workflow Runs - {selectedUserForLogs?.full_name || selectedUserForLogs?.email}
            </DialogTitle>
            <DialogDescription>
              All workflow executions with form data
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh]">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userWorkflowRuns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No workflow runs found
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Form Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userWorkflowRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          {run.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <XCircle className="h-5 w-5 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-[300px]">{run.error_message || 'Unknown error'}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(run.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{run.workflow_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] sm:max-w-[400px] text-xs">
                            {Object.entries(run.form_data || {}).map(([key, value]) => (
                              <div key={key} className="truncate">
                                <span className="font-medium text-muted-foreground">{key}:</span>{' '}
                                <span className="text-foreground">{value || '-'}</span>
                              </div>
                            ))}
                            {(!run.form_data || Object.keys(run.form_data).length === 0) && (
                              <span className="text-muted-foreground">No form data</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
