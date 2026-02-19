import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, Edit, Plus, Search, Upload, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { workflows as hardcodedWorkflows } from "@/data/workflows";
import { ROLES, Role } from "@/types/workflow";

interface DbWorkflow {
  id: string;
  original_id: string | null;
  title: string;
  description: string;
  long_description: string | null;
  category: string;
  webhook_url: string;
  stage: string | null;
  roles: string[];
  workflow_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_beta: boolean;
  publish_status: "staging" | "production";
}

const CATEGORIES = [
  "AI-Powered Research & Strategy Briefs",
  "AI Audio Research & Briefings",
  "Call/Transcript-Based Intelligence",
  "Evaluations Assistant AI (opp based)",
  "Portfolio Intelligence",
];

const ManageWorkflows = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [workflows, setWorkflows] = useState<DbWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editWorkflow, setEditWorkflow] = useState<DbWorkflow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Always check super admin from database - no caching
  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      setIsSuperAdmin(!!data);
    };
    checkAdmin();
  }, [user?.id]);

  // Redirect if not super admin
  useEffect(() => {
    if (isSuperAdmin === false && user !== undefined) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/workflows");
    }
  }, [isSuperAdmin, user, navigate, toast]);

  // Load workflows
  const loadWorkflows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: "Error loading workflows", description: error.message, variant: "destructive" });
    } else {
      setWorkflows((data || []) as DbWorkflow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) loadWorkflows();
  }, [isSuperAdmin]);

  // Sync hardcoded workflows to database
  const syncHardcodedWorkflows = async () => {
    if (!user) return;
    setIsSyncing(true);

    try {
      const existingIds = workflows.map(w => w.original_id).filter(Boolean);
      const toSync = hardcodedWorkflows.filter(w => !existingIds.includes(w.id));

      if (toSync.length === 0) {
        toast({ title: "All workflows already synced", description: "No new workflows to import." });
        setIsSyncing(false);
        return;
      }

      const workflowsToInsert = toSync.map(w => {
        const hasAccountId = w.parameters.some(p => p.name === 'salesforceAccountId');
        const hasOppId = w.parameters.some(p => p.name === 'salesforceOpportunityId');
        const workflowType = hasOppId ? 'salesforce-opportunity' : hasAccountId ? 'salesforce-account' : 'regular';

        return {
          original_id: w.id,
          title: w.title,
          description: w.description,
          long_description: w.longDescription || null,
          category: w.category,
          webhook_url: w.webhook,
          stage: w.stage || 'Research',
          roles: w.roles,
          workflow_type: workflowType,
          created_by: user.id,
          is_active: true,
          publish_status: 'production' as const,
        };
      });

      const { error } = await supabase.from('workflows').insert(workflowsToInsert);

      if (error) {
        toast({ title: "Error syncing workflows", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Workflows synced!", description: `${toSync.length} workflows imported.` });
        loadWorkflows();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to sync workflows.", variant: "destructive" });
    }
    setIsSyncing(false);
  };

  // Filter workflows
  const filteredWorkflows = workflows.filter(w =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Select all
  const handleSelectAll = () => {
    if (selectedIds.size === filteredWorkflows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWorkflows.map(w => w.id)));
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from('workflows')
      .delete()
      .in('id', Array.from(selectedIds));

    if (error) {
      toast({ title: "Error deleting workflows", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `${selectedIds.size} workflow(s) deleted.` });
      setSelectedIds(new Set());
      loadWorkflows();
    }
    setIsDeleting(false);
  };

  // Update workflow
  const handleUpdateWorkflow = async () => {
    if (!editWorkflow) return;

    const { error } = await supabase
      .from('workflows')
      .update({
        title: editWorkflow.title,
        description: editWorkflow.description,
        long_description: editWorkflow.long_description,
        category: editWorkflow.category,
        webhook_url: editWorkflow.webhook_url,
        stage: editWorkflow.stage,
        roles: editWorkflow.roles,
        is_active: editWorkflow.is_active,
        is_beta: editWorkflow.is_beta,
        publish_status: editWorkflow.publish_status,
      })
      .eq('id', editWorkflow.id);

    if (error) {
      toast({ title: "Error updating workflow", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Workflow updated successfully." });
      setIsEditOpen(false);
      setEditWorkflow(null);
      loadWorkflows();
    }
  };

  if (isSuperAdmin === null) {
    return (
      <div className="flex-1 bg-background">
        <main className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="flex-1 bg-background">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <Button variant="ghost" onClick={() => navigate("/workflows")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workflows
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-page-title text-foreground">Manage Workflows</h1>
            <p className="text-muted-foreground mt-1">Edit, delete, or sync workflows</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={syncHardcodedWorkflows} disabled={isSyncing}>
              <Upload className="h-4 w-4 mr-2" />
              {isSyncing ? "Syncing..." : "Import Default Workflows"}
            </Button>
            <Button onClick={() => navigate("/workflows/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>All Workflows ({workflows.length})</CardTitle>
                <CardDescription>Manage all workflows in the database</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                {selectedIds.size > 0 && (
                  <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedIds.size})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filteredWorkflows.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No workflows found. Click "Import Default Workflows" to sync existing workflows.
              </p>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === filteredWorkflows.length && filteredWorkflows.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Category</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="hidden lg:table-cell">Publish Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Beta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(workflow.id)}
                            onCheckedChange={() => toggleSelection(workflow.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{workflow.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{workflow.category}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{workflow.workflow_type}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={workflow.publish_status === "production" ? "default" : "secondary"}>
                            {workflow.publish_status === "production" ? "Production" : "Staging"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {workflow.is_beta && (
                            <Badge className="bg-primary/20 text-primary border-primary/30">Beta</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={workflow.is_active ? "default" : "secondary"}>
                            {workflow.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditWorkflow(workflow);
                              setIsEditOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Workflow</DialogTitle>
              <DialogDescription>Update workflow details</DialogDescription>
            </DialogHeader>
            {editWorkflow && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={editWorkflow.title}
                      onChange={(e) => setEditWorkflow({ ...editWorkflow, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={editWorkflow.category}
                      onValueChange={(value) => setEditWorkflow({ ...editWorkflow, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editWorkflow.description}
                    onChange={(e) => setEditWorkflow({ ...editWorkflow, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    value={editWorkflow.webhook_url}
                    onChange={(e) => setEditWorkflow({ ...editWorkflow, webhook_url: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select
                      value={editWorkflow.stage || 'Research'}
                      onValueChange={(value) => setEditWorkflow({ ...editWorkflow, stage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Research">Research</SelectItem>
                        <SelectItem value="Discovery">Discovery</SelectItem>
                        <SelectItem value="Proposal">Proposal</SelectItem>
                        <SelectItem value="Closing">Closing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Publish Status</Label>
                    <Select
                      value={editWorkflow.publish_status}
                      onValueChange={(value: "staging" | "production") => setEditWorkflow({ ...editWorkflow, publish_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staging">Staging (Super Admins Only)</SelectItem>
                        <SelectItem value="production">Production (All Users)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Active Status</Label>
                  <Select
                    value={editWorkflow.is_active ? "active" : "inactive"}
                    onValueChange={(value) => setEditWorkflow({ ...editWorkflow, is_active: value === "active" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Beta Badge</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-is-beta"
                      checked={editWorkflow.is_beta}
                      onCheckedChange={(checked) => setEditWorkflow({ ...editWorkflow, is_beta: !!checked })}
                    />
                    <Label htmlFor="edit-is-beta">Show Beta badge on this workflow</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-role-${role}`}
                          checked={editWorkflow.roles.includes(role)}
                          onCheckedChange={(checked) => {
                            const newRoles = checked
                              ? [...editWorkflow.roles, role]
                              : editWorkflow.roles.filter(r => r !== role);
                            setEditWorkflow({ ...editWorkflow, roles: newRoles });
                          }}
                        />
                        <Label htmlFor={`edit-role-${role}`}>{role}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateWorkflow}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManageWorkflows;