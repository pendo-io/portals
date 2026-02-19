import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

interface QuestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  source?: "help" | "idea";
}

const QuestionDialog = ({ isOpen, onClose, source = "help" }: QuestionDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [notes, setNotes] = useState("");
  const [yourName, setYourName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs securely with zod
    const schema = z.object({
      email: z
        .string()
        .trim()
        .email({ message: "Please enter a valid email" })
        .max(255),
      Workflow: z.string().trim().min(1, { message: "Workflow is required" }).max(200),
      Notes: z.string().trim().min(1, { message: "Notes are required" }).max(1000),
      Your_Name: z.string().trim().min(1, { message: "Your name is required" }).max(120),
    });

    // Add source context to notes
    const noteWithContext = source === "idea" 
      ? `[From: Got an Idea]\n\n${notes.trim()}`
      : notes.trim();

    const payload = {
      email: email.trim(),
      Workflow: workflow.trim(),
      Notes: noteWithContext,
      Your_Name: yourName.trim(),
    };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid input";
      toast({ title: "Invalid input", description: firstError, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-slack-message', {
        body: payload,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Request sent",
        description: "Your message has been sent successfully.",
      });
      // Reset form
      setEmail("");
      setWorkflow("");
      setNotes("");
      setYourName("");
      onClose();
    } catch (error) {
      console.error("Error sending question:", error);
      toast({
        title: "Error",
        description: "Failed to send your question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Have Questions?
          </DialogTitle>
          <DialogDescription>
            Connect with us on Slack for quick assistance and support from the Revenue Strategy team.
            <br />
            <span className="font-semibold mt-2 inline-block">#help_gtm_rev_hub</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workflow">Workflow *</Label>
            <Input
              id="workflow"
              type="text"
              placeholder="Which workflow are you asking about?"
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yourName">Your Name *</Label>
            <Input
              id="yourName"
              type="text"
              placeholder="Your full name"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes *</Label>
            <Textarea
              id="notes"
              placeholder="Your question or feedback..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionDialog;
