import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Workflow } from "@/types/workflow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkflowCardProps {
  workflow: Workflow;
  onLaunch: (workflow: Workflow) => void;
  disabled?: boolean;
  loading?: boolean;
}

const WorkflowCard = ({ workflow, onLaunch, disabled, loading }: WorkflowCardProps) => {
  if (!workflow) return null;

  const { title, description, icon: Icon, isBeta } = workflow;

  const launchButton = (
    <Button
      size="sm"
      onClick={() => onLaunch(workflow)}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          Launching...
        </>
      ) : (
        "Launch"
      )}
    </Button>
  );

  return (
    <Card className="group flex flex-col border border-border bg-card p-4 transition-colors hover:border-primary/40">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <h3 className="text-sm font-semibold text-card-foreground truncate flex-1 min-w-0">
          {title}
        </h3>
        {isBeta && (
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs py-0 px-1.5 shrink-0">
            Beta
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 flex-1">
        {description}
      </p>

      {/* Launch */}
      <div className="flex justify-end mt-auto">
        {disabled ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>{launchButton}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Select an account above to launch</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          launchButton
        )}
      </div>
    </Card>
  );
};

export default WorkflowCard;
