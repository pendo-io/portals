import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  searchQuery: string;
  onClearFilters: () => void;
}

const EmptyState = ({ searchQuery, onClearFilters }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-medium text-foreground mb-2">
        No workflows found
      </h3>

      <p className="text-muted-foreground mb-6 max-w-md">
        {searchQuery
          ? "No results match your current filters. Try adjusting your search."
          : "No workflows available in this category."
        }
      </p>

      {searchQuery && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
