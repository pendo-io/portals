import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>
            Get assistance with AI Workflow Hub
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <h4 className="font-medium mb-2">Getting Started</h4>
            <p className="text-sm text-muted-foreground">
              Browse workflows by category, use the search to find specific tools, or filter by your role to see relevant workflows.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Launching Workflows</h4>
            <p className="text-sm text-muted-foreground">
              Click "Launch Workflow" on any card to trigger the AI automation. Click the info icon for detailed documentation and sample inputs.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Need Help?</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Questions about workflows or need a custom automation? Contact our GTM Ops team.
            </p>
            <Button variant="outline" className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Contact GTM Ops
            </Button>
          </div>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Need a new workflow?</strong> Request it via GTM Ops and we'll build it for you.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;