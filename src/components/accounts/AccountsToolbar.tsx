import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";

interface AccountsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  industryFilter: string;
  onIndustryFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  industries: string[];
  statuses: string[];
  totalCount: number;
  filteredCount: number;
  isSearching?: boolean;
  searchAll: boolean;
  onSearchAllChange: (value: boolean) => void;
}

export function AccountsToolbar({
  search,
  onSearchChange,
  industryFilter,
  onIndustryFilterChange,
  statusFilter,
  onStatusFilterChange,
  industries,
  statuses,
  totalCount,
  filteredCount,
  isSearching,
  searchAll,
  onSearchAllChange,
}: AccountsToolbarProps) {
  return (
    <div className="border-b px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
      {/* Search */}
      <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          placeholder={searchAll ? "Search all SFDC accounts..." : "Search my accounts..."}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* All SFDC toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="search-all"
          checked={searchAll}
          onCheckedChange={onSearchAllChange}
        />
        <Label htmlFor="search-all" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
          All SFDC
        </Label>
      </div>

      {/* Industry filter */}
      <Select value={industryFilter} onValueChange={onIndustryFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px] h-9">
          <SelectValue placeholder="Industry" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Industries</SelectItem>
          {industries.map((industry) => (
            <SelectItem key={industry} value={industry}>
              {industry}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Count badge */}
      <Badge variant="secondary" className="ml-auto">
        {filteredCount === totalCount
          ? `${totalCount} accounts`
          : `${filteredCount} of ${totalCount} accounts`}
      </Badge>
    </div>
  );
}
