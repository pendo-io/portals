import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  "6sense New Hot Account": "Hot Account",
  "Sixth Sense Contact Engagement": "Contact Engagement",
  "Sixth Sense Recent Web Visits": "Web Visits",
  "Sixth Sense Recent Intent Activities": "Intent Activity",
  "Job Postings - Growth Flag": "Growth Flag",
  "Hiring": "Senior Hire",
  "News": "News",
  "Fundraising": "Fundraising",
  "Product Release": "Product Release",
  "Qualified Signals Engagement": "Qualified Signal",
};

interface SignalsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  signalTypeFilter: string;
  onSignalTypeFilterChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  signalTypes: string[];
  sources: string[];
  totalCount: number;
  filteredCount: number;
  showDismissed: boolean;
  onShowDismissedChange: (value: boolean) => void;
  dismissedCount: number;
}

export function SignalsToolbar({
  search,
  onSearchChange,
  signalTypeFilter,
  onSignalTypeFilterChange,
  sourceFilter,
  onSourceFilterChange,
  signalTypes,
  sources,
  totalCount,
  filteredCount,
  showDismissed,
  onShowDismissedChange,
  dismissedCount,
}: SignalsToolbarProps) {
  return (
    <div className="border-b px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
      {/* Search */}
      <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search signals..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Signal type filter */}
      <Select value={signalTypeFilter} onValueChange={onSignalTypeFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px] h-9">
          <SelectValue placeholder="Signal Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {signalTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {SIGNAL_TYPE_LABELS[type] || type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source filter */}
      <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px] h-9">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {sources.map((source) => (
            <SelectItem key={source} value={source}>
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Show dismissed toggle */}
      {dismissedCount > 0 && (
        <div className="flex items-center gap-2">
          <Switch
            id="show-dismissed"
            checked={showDismissed}
            onCheckedChange={onShowDismissedChange}
          />
          <Label htmlFor="show-dismissed" className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer">
            Show dismissed ({dismissedCount})
          </Label>
        </div>
      )}

      {/* Count badge */}
      <Badge variant="secondary" className="ml-auto">
        {filteredCount === totalCount
          ? `${totalCount} signals`
          : `${filteredCount} of ${totalCount} signals`}
      </Badge>
    </div>
  );
}
