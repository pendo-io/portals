import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  User,
  Clock,
  Video,
  CheckCircle2,
  Building2,
  X,
  ArrowUpDown,
  UserCircle,
  LayoutGrid,
  Table2,
  Bell,
  BellOff,
  Copy,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActionItem {
  task: string;
  owner: string;
  priority: "high" | "medium" | "low";
  dueDate?: string;
  meetingTitle?: string;
  meetingDate?: string;
  externalAttendees?: string[];
  needsFollowUp?: boolean;
  meetingSummary?: string;
}

interface EnrichedActionItem extends ActionItem {
  clientName: string;
  needsFollowUp: boolean;
}

interface ActionItemsByPriority {
  high: ActionItem[];
  medium: ActionItem[];
  low: ActionItem[];
}

interface ActionItemsViewProps {
  actionItemsByPriority: ActionItemsByPriority;
  totalActionItems: number;
  userEmail?: string;
  userName?: string;
  isSuperAdmin?: boolean;
}

type SortField = "priority" | "owner" | "dueDate" | "meeting" | "client";
type SortDirection = "asc" | "desc";
type ViewMode = "cards" | "table";

// Helper to extract client name from email domain or meeting title
const extractClientName = (item: ActionItem): string => {
  // Try external attendee email domains first (most reliable for client identification)
  if (item.externalAttendees && item.externalAttendees.length > 0) {
    for (const attendee of item.externalAttendees) {
      if (attendee.includes('@')) {
        const domain = attendee.split('@')[1]?.split('.')[0]?.toLowerCase();
        // Skip internal domain (pendo) and common email providers
        if (domain && domain.length > 2 &&
            domain !== 'pendo' &&
            !['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud'].includes(domain)) {
          return domain.charAt(0).toUpperCase() + domain.slice(1);
        }
      }
    }
  }

  // Fallback: Try meeting title (patterns like "Company | Meeting" or "Company - Meeting")
  if (item.meetingTitle) {
    const titleMatch = item.meetingTitle.match(/^([^|/\\-]+?)(?:\s*[|/\\-])/);
    if (titleMatch && titleMatch[1].trim().length > 2) {
      const extracted = titleMatch[1].trim().toLowerCase();
      // Skip if it contains "pendo"
      if (!extracted.includes('pendo')) {
        return titleMatch[1].trim();
      }
    }
  }

  return "";
};

// Helper to determine if task needs follow-up based on priority and keywords
const determineNeedsFollowUp = (item: ActionItem): boolean => {
  if (item.needsFollowUp !== undefined) return item.needsFollowUp;

  // High priority items always need follow-up
  if (item.priority === "high") return true;

  // Check for follow-up keywords in task
  const followUpKeywords = ['follow up', 'follow-up', 'followup', 'schedule', 'send', 'reach out', 'contact', 'call', 'email', 'meeting', 'demo', 'proposal'];
  const taskLower = item.task.toLowerCase();
  return followUpKeywords.some(keyword => taskLower.includes(keyword));
};

export function ActionItemsView({ actionItemsByPriority, totalActionItems, userEmail, userName, isSuperAdmin = false }: ActionItemsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(["high", "medium", "low"]);
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedMeeting, setSelectedMeeting] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<string>("all");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedDetailItem, setSelectedDetailItem] = useState<EnrichedActionItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleItemClick = (item: EnrichedActionItem) => {
    setSelectedDetailItem(item);
    setDetailDialogOpen(true);
  };

  const handleCopyItem = (item: EnrichedActionItem) => {
    const text = `Task: ${item.task}\nOwner: ${item.owner}\nPriority: ${item.priority}${item.dueDate ? `\nDue: ${item.dueDate}` : ""}${item.meetingTitle ? `\nFrom: ${item.meetingTitle}` : ""}${item.clientName ? `\nClient: ${item.clientName}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Action item copied", { position: "top-center" });
  };

  // Flatten all action items with client name and follow-up status
  const allItems = useMemo(() => {
    return [
      ...actionItemsByPriority.high.map(item => ({
        ...item,
        priority: "high" as const,
        clientName: extractClientName(item),
        needsFollowUp: determineNeedsFollowUp(item)
      })),
      ...actionItemsByPriority.medium.map(item => ({
        ...item,
        priority: "medium" as const,
        clientName: extractClientName(item),
        needsFollowUp: determineNeedsFollowUp(item)
      })),
      ...actionItemsByPriority.low.map(item => ({
        ...item,
        priority: "low" as const,
        clientName: extractClientName(item),
        needsFollowUp: determineNeedsFollowUp(item)
      })),
    ];
  }, [actionItemsByPriority]);

  // Get unique owners
  const owners = useMemo(() => {
    const ownerSet = new Set(allItems.map(item => item.owner));
    return Array.from(ownerSet).sort();
  }, [allItems]);

  // Get unique meetings
  const meetings = useMemo(() => {
    const meetingSet = new Set(allItems.filter(item => item.meetingTitle).map(item => item.meetingTitle!));
    return Array.from(meetingSet).sort();
  }, [allItems]);

  // Get unique clients (exclude empty strings)
  const clients = useMemo(() => {
    const clientSet = new Set(allItems.map(item => item.clientName).filter(c => c && c.length > 0));
    return Array.from(clientSet).sort();
  }, [allItems]);

  // Check if current user name matches an owner (for "My Tasks" filter)
  const matchesCurrentUser = (ownerName: string): boolean => {
    if (!userEmail && !userName) return false;

    const ownerLower = ownerName.toLowerCase();

    // Match by email prefix
    if (userEmail) {
      const emailPrefix = userEmail.split('@')[0].toLowerCase().replace(/[._]/g, ' ');
      if (ownerLower.includes(emailPrefix) || emailPrefix.includes(ownerLower.split(' ')[0])) {
        return true;
      }
    }

    // Match by name
    if (userName) {
      const nameLower = userName.toLowerCase();
      const nameParts = nameLower.split(' ');
      const ownerParts = ownerLower.split(' ');

      // Check if first name matches or full name matches
      if (nameLower === ownerLower) return true;
      if (nameParts.length > 0 && ownerParts.length > 0) {
        if (nameParts[0] === ownerParts[0]) return true; // First name match
        if (nameParts.some(p => ownerParts.includes(p))) return true; // Any part matches
      }
    }

    return false;
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = allItems;

    // My Tasks filter
    if (myTasksOnly) {
      result = result.filter(item => matchesCurrentUser(item.owner));
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.task.toLowerCase().includes(query) ||
        item.owner.toLowerCase().includes(query) ||
        item.meetingTitle?.toLowerCase().includes(query) ||
        item.clientName?.toLowerCase().includes(query)
      );
    }

    // Priority filter
    result = result.filter(item => selectedPriorities.includes(item.priority));

    // Owner filter
    if (selectedOwner !== "all") {
      result = result.filter(item => item.owner === selectedOwner);
    }

    // Meeting filter
    if (selectedMeeting !== "all") {
      result = result.filter(item => item.meetingTitle === selectedMeeting);
    }

    // Client filter
    if (selectedClient !== "all") {
      result = result.filter(item => item.clientName === selectedClient);
    }

    // Follow-up filter
    if (followUpFilter !== "all") {
      const needsFollowUp = followUpFilter === "yes";
      result = result.filter(item => item.needsFollowUp === needsFollowUp);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "owner":
          comparison = a.owner.localeCompare(b.owner);
          break;
        case "dueDate":
          const aDate = a.dueDate || "9999-99-99";
          const bDate = b.dueDate || "9999-99-99";
          comparison = aDate.localeCompare(bDate);
          break;
        case "meeting":
          comparison = (a.meetingTitle || "").localeCompare(b.meetingTitle || "");
          break;
        case "client":
          comparison = (a.clientName || "").localeCompare(b.clientName || "");
          break;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [allItems, searchQuery, selectedPriorities, selectedOwner, selectedMeeting, selectedClient, followUpFilter, myTasksOnly, sortField, sortDirection]);

  const togglePriority = (priority: string) => {
    setSelectedPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedPriorities(["high", "medium", "low"]);
    setSelectedOwner("all");
    setSelectedMeeting("all");
    setSelectedClient("all");
    setFollowUpFilter("all");
    setMyTasksOnly(false);
    setSortField("priority");
    setSortDirection("desc");
  };

  const hasActiveFilters = searchQuery ||
    selectedPriorities.length !== 3 ||
    selectedOwner !== "all" ||
    selectedMeeting !== "all" ||
    selectedClient !== "all" ||
    followUpFilter !== "all" ||
    myTasksOnly;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "high":
        return { dot: "bg-rose-500", badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400" };
      case "medium":
        return { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
      case "low":
        return { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" };
      default:
        return { dot: "bg-muted-foreground", badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" };
    }
  };

  if (totalActionItems === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No action items for this week
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="border-b px-3 sm:px-6 py-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks, owners, meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Priority Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Priority
                {selectedPriorities.length !== 3 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {selectedPriorities.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedPriorities.includes("high")}
                onCheckedChange={() => togglePriority("high")}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>High Priority</span>
                </div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedPriorities.includes("medium")}
                onCheckedChange={() => togglePriority("medium")}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Medium Priority</span>
                </div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedPriorities.includes("low")}
                onCheckedChange={() => togglePriority("low")}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Low Priority</span>
                </div>
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Owner Filter - Only visible to super admins */}
          {isSuperAdmin && (
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger className="w-[180px]">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Meeting Filter */}
          <Select value={selectedMeeting} onValueChange={setSelectedMeeting}>
            <SelectTrigger className="w-[180px]">
              <Video className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Meetings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meetings</SelectItem>
              {meetings.map((meeting) => (
                <SelectItem key={meeting} value={meeting}>
                  <span className="truncate">{meeting}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Client Filter */}
          {clients.length > 0 && (
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client} value={client}>
                    {client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Follow-up Filter */}
          <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
            <SelectTrigger className="w-[160px]">
              <Bell className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Follow-up" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="yes">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-amber-500" />
                  <span>Needs Follow-up</span>
                </div>
              </SelectItem>
              <SelectItem value="no">
                <div className="flex items-center gap-2">
                  <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>No Follow-up</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* My Tasks Toggle */}
          {(userEmail || userName) && (
            <Button
              variant={myTasksOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setMyTasksOnly(!myTasksOnly)}
              className={cn(
                "gap-2",
                myTasksOnly && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <UserCircle className="h-4 w-4" />
              My Tasks
            </Button>
          )}

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={sortField === "priority"}
                onCheckedChange={() => setSortField("priority")}
              >
                Priority
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortField === "owner"}
                onCheckedChange={() => setSortField("owner")}
              >
                Owner
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortField === "dueDate"}
                onCheckedChange={() => setSortField("dueDate")}
              >
                Due Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortField === "meeting"}
                onCheckedChange={() => setSortField("meeting")}
              >
                Meeting
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortField === "client"}
                onCheckedChange={() => setSortField("client")}
              >
                Client
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={sortDirection === "desc"}
                onCheckedChange={() => setSortDirection(sortDirection === "desc" ? "asc" : "desc")}
              >
                {sortDirection === "desc" ? "Descending" : "Ascending"}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Results Summary & View Toggle */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredItems.length}</span> of {totalActionItems} items
            </span>

            {/* View Mode Toggle */}
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} className="bg-muted/50 rounded-lg p-0.5">
              <ToggleGroupItem value="cards" aria-label="Card view" className="h-7 px-2.5 data-[state=on]:bg-background">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view" className="h-7 px-2.5 data-[state=on]:bg-background">
                <Table2 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
              {actionItemsByPriority.high.length} High
            </span>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              {actionItemsByPriority.medium.length} Medium
            </span>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              {actionItemsByPriority.low.length} Low
            </span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filteredItems.length > 0 ? (
        viewMode === "cards" ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 px-3 sm:px-6">
            {filteredItems.map((item, idx) => {
              const config = getPriorityConfig(item.priority);
              return (
                <Card
                  key={idx}
                  className="cursor-pointer hover:bg-muted/50 transition-colors border"
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="p-4">
                    {/* Priority Badge & Follow-up */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", config.badge)}>
                          {item.priority}
                        </span>
                        {item.needsFollowUp && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            <Bell className="h-3 w-3 mr-1" />
                            Follow-up
                          </span>
                        )}
                      </div>
                      {item.dueDate ? (
                        <div className={cn("flex items-center gap-1.5 text-xs", isOverdue(item.dueDate) ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                          {isOverdue(item.dueDate) && <AlertTriangle className="h-3 w-3" />}
                          <Clock className="h-3 w-3" />
                          <span className={cn(isOverdue(item.dueDate) && "font-semibold")}>{item.dueDate}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No date</span>
                      )}
                    </div>

                    {/* Task */}
                    <p className="text-sm font-medium leading-relaxed mb-4 line-clamp-3">
                      {item.task}
                    </p>

                    {/* Owner & Meeting & Client */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{item.owner}</span>
                      </div>
                      {item.clientName && item.clientName.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{item.clientName}</span>
                        </div>
                      )}
                      {item.meetingTitle && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Video className="h-3.5 w-3.5" />
                          <span className="truncate">{item.meetingTitle}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="w-full overflow-x-auto border-b">
            <div className="max-h-[calc(100vh-380px)] overflow-auto">
              <table className="w-full caption-bottom text-sm [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                <thead>
                  <tr className="border-b bg-muted/30 hover:bg-muted/30">
                    <th className="sticky top-0 z-20 h-12 w-[80px] px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider bg-muted/30">
                      Priority
                    </th>
                    <th className="sticky top-0 z-20 h-12 min-w-[300px] px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider bg-muted/30">
                      Task
                    </th>
                    <th className="sticky top-0 z-20 h-12 w-[150px] px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider bg-muted/30">
                      Owner
                    </th>
                    <th className="sticky top-0 z-20 h-12 w-[120px] px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider bg-muted/30">
                      Client
                    </th>
                    <th className="sticky top-0 z-20 h-12 w-[100px] px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider bg-muted/30">
                      Due Date
                    </th>
                    <th className="sticky top-0 z-20 h-12 w-[100px] px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider bg-muted/30">
                      Follow-up
                    </th>
                    <th className="sticky top-0 z-20 h-12 min-w-[200px] px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider bg-muted/30">
                      Meeting
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const config = getPriorityConfig(item.priority);

                    return (
                      <tr
                        key={idx}
                        className="border-b cursor-pointer hover:bg-muted/50 h-[52px]"
                        onClick={() => handleItemClick(item)}
                      >
                        <td className="py-2 px-4 align-middle">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", config.badge)}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="py-2 px-4 align-middle font-medium min-w-[300px]">
                          {item.task}
                        </td>
                        <td className="py-2 px-4 align-middle w-[150px]">
                          <span className="text-sm">{item.owner}</span>
                        </td>
                        <td className="py-2 px-4 align-middle w-[120px]">
                          <span className="text-sm">{item.clientName || "-"}</span>
                        </td>
                        <td className="py-2 px-4 align-middle w-[100px]">
                          {item.dueDate ? (
                            <div className={cn("flex items-center gap-1.5 text-xs", isOverdue(item.dueDate) ? "text-red-600 dark:text-red-400 font-semibold" : "text-muted-foreground")}>
                              {isOverdue(item.dueDate) && <AlertTriangle className="h-3 w-3" />}
                              <span>{item.dueDate}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 px-4 align-middle w-[100px]">
                          {item.needsFollowUp ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="py-2 px-4 align-middle min-w-[200px]">
                          {item.meetingTitle ? (
                            <span className="text-xs text-muted-foreground truncate block max-w-[200px]">{item.meetingTitle}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="text-center">
            <p>No matching items</p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-3"
            >
              Clear filters
            </Button>
          </div>
        </div>
      )}
    </div>

      {/* Action Item Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Action Item Detail
            </DialogTitle>
          </DialogHeader>
          {selectedDetailItem && (
            <div className="space-y-4">
              {/* Full task description */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm font-medium leading-relaxed">{selectedDetailItem.task}</p>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Owner</p>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedDetailItem.owner}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Due Date</p>
                  <div className="flex items-center gap-2">
                    {selectedDetailItem.dueDate ? (
                      <>
                        <Calendar className={cn("h-3.5 w-3.5", isOverdue(selectedDetailItem.dueDate) ? "text-red-600 dark:text-red-400" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-medium", isOverdue(selectedDetailItem.dueDate) && "text-red-600 dark:text-red-400")}>{selectedDetailItem.dueDate}</span>
                        {isOverdue(selectedDetailItem.dueDate) && (
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">Overdue</span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">No date set</span>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Priority</p>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", getPriorityConfig(selectedDetailItem.priority).badge)}>
                    {selectedDetailItem.priority}
                  </span>
                </div>
                {selectedDetailItem.clientName && (
                  <div className="p-3 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Client</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{selectedDetailItem.clientName}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Why This Task */}
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Why This Task</p>

                {selectedDetailItem.meetingTitle && (
                  <p className="text-sm leading-relaxed text-foreground">
                    This action item was identified during <span className="font-semibold">{selectedDetailItem.meetingTitle}</span>
                    {selectedDetailItem.meetingDate && <> on {selectedDetailItem.meetingDate}</>}.
                    {selectedDetailItem.meetingSummary && (
                      <> During the meeting, the team discussed: {selectedDetailItem.meetingSummary}</>
                    )}
                  </p>
                )}

                <p className="text-sm leading-relaxed text-foreground">
                  The task "<span className="font-medium">{selectedDetailItem.task}</span>" was flagged as a <span className="font-medium">{selectedDetailItem.priority}-priority</span> action item because it requires direct follow-up
                  {selectedDetailItem.owner && <> by <span className="font-semibold">{selectedDetailItem.owner}</span></>}
                  {selectedDetailItem.dueDate && <>, with a commitment date of {selectedDetailItem.dueDate}</>}.
                  {selectedDetailItem.clientName && <> This is relevant to the <span className="font-semibold">{selectedDetailItem.clientName}</span> account.</>}
                </p>

                {!selectedDetailItem.meetingTitle && selectedDetailItem.meetingSummary && (
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                    Meeting context: {selectedDetailItem.meetingSummary}
                  </p>
                )}
              </div>

              {/* Copy button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => handleCopyItem(selectedDetailItem)}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Action Item
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
