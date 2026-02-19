import { cn } from "@/lib/utils";

interface CategorySidebarProps {
  categories: readonly string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  getCategoryCount: (category: string) => number;
  totalCount: number;
}

const CategorySidebar = ({
  categories,
  activeCategory,
  onCategoryChange,
  getCategoryCount,
  totalCount,
}: CategorySidebarProps) => {
  const items = [
    { value: "all", label: "All Workflows", count: totalCount },
    ...categories.map((cat) => ({
      value: cat,
      label: cat,
      count: getCategoryCount(cat),
    })),
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border pr-4 py-2">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.value}>
              <button
                onClick={() => onCategoryChange(item.value)}
                className={cn(
                  "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left",
                  activeCategory === item.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="truncate">{item.label}</span>
                <span
                  className={cn(
                    "ml-2 shrink-0 text-xs tabular-nums",
                    activeCategory === item.value
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile horizontal scroll */}
      <div className="lg:hidden overflow-x-auto border-b border-border px-3 py-2">
        <div className="flex gap-2">
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => onCategoryChange(item.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeCategory === item.value
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
              <span className="ml-1 tabular-nums">({item.count})</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CategorySidebar;
