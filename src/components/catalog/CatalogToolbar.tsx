import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw } from "lucide-react";

interface CatalogToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  workflowCount: number;
  loading: boolean;
  onRefresh: () => void;
  categories: readonly string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CatalogToolbar = ({
  searchQuery,
  onSearchChange,
  workflowCount,
  loading,
  onRefresh,
  categories,
  activeCategory,
  onCategoryChange,
}: CatalogToolbarProps) => {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workflows..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={activeCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[180px] shrink-0 hidden sm:flex">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="hidden md:inline shrink-0 text-sm text-muted-foreground tabular-nums">
        {workflowCount} workflows
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        aria-label="Refresh workflows"
      >
        <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      </Button>
    </div>
  );
};

export default CatalogToolbar;
