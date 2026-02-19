import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { UserX, Eye } from "lucide-react";

export function ImpersonationBanner() {
  const { impersonatedUser, isImpersonating, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium">
      <Eye className="h-4 w-4" />
      <span>
        Viewing as: <strong>{impersonatedUser.full_name || impersonatedUser.email}</strong>
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 bg-amber-600 hover:bg-amber-700 text-amber-50"
        onClick={stopImpersonation}
      >
        <UserX className="h-3.5 w-3.5 mr-1" />
        Exit Impersonation
      </Button>
    </div>
  );
}
