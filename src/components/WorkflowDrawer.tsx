import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { Workflow } from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";

interface WorkflowDrawerProps {
  workflow: Workflow | null;
  isOpen: boolean;
  onClose: () => void;
}

const WorkflowDrawer = ({ workflow, isOpen, onClose }: WorkflowDrawerProps) => {
  const { toast } = useToast();

  const copyWebhookUrl = () => {
    if (workflow) {
      navigator.clipboard.writeText(`https://api.pendo.io${workflow.webhook}`);
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard.",
      });
    }
  };

  if (!workflow) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <workflow.icon className="h-5 w-5 text-primary" />
            </div>
            <span>{workflow.title}</span>
          </SheetTitle>
          <SheetDescription>About this workflow</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Long Description */}
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {workflow.longDescription || workflow.description}
            </p>
          </div>

          {/* Roles */}
          <div>
            <h4 className="font-medium mb-2">Relevant Roles</h4>
            <div className="flex flex-wrap gap-2">
              {workflow.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button className="flex-1 bg-primary hover:bg-primary/90">
              <ExternalLink className="h-4 w-4 mr-2" />
              Launch Workflow
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WorkflowDrawer;