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

interface ContactsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  departments: string[];
  totalCount: number;
  filteredCount: number;
  isSearching?: boolean;
  searchAll: boolean;
  onSearchAllChange: (value: boolean) => void;
}

export function ContactsToolbar({
  search,
  onSearchChange,
  departmentFilter,
  onDepartmentFilterChange,
  departments,
  totalCount,
  filteredCount,
  isSearching,
  searchAll,
  onSearchAllChange,
}: ContactsToolbarProps) {
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
          placeholder={searchAll ? "Search all SFDC contacts..." : "Search my contacts..."}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* All SFDC toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="search-all-contacts"
          checked={searchAll}
          onCheckedChange={onSearchAllChange}
        />
        <Label htmlFor="search-all-contacts" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
          All SFDC
        </Label>
      </div>

      {/* Department filter */}
      <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px] h-9">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Count badge */}
      <Badge variant="secondary" className="ml-auto">
        {filteredCount === totalCount
          ? `${totalCount} contacts`
          : `${filteredCount} of ${totalCount} contacts`}
      </Badge>
    </div>
  );
}
