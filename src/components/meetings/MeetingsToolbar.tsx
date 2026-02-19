import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface MeetingsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
}

export function MeetingsToolbar({
  search,
  onSearchChange,
  totalCount,
  filteredCount,
}: MeetingsToolbarProps) {
  return (
    <div className="border-b px-6 py-3 flex items-center gap-4 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search meetings..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Count badge */}
      <Badge variant="secondary" className="ml-auto">
        {filteredCount === totalCount
          ? `${totalCount} meetings`
          : `${filteredCount} of ${totalCount} meetings`}
      </Badge>
    </div>
  );
}
