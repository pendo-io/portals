import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Workflow } from "@/types/workflow";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Fields that are auto-filled from the logged-in user
const AUTO_FIELDS = new Set(["yourEmail", "yourName"]);

interface WorkflowFormProps {
  workflow: Workflow | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (workflow: Workflow, data: Record<string, string>) => void;
  isLoading: boolean;
}

const WorkflowForm = ({ workflow, isOpen, onClose, onSubmit, isLoading }: WorkflowFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [sfIdError, setSfIdError] = useState<string>("");

  // Auto-populate email and name from user profile when form opens
  useEffect(() => {
    if (isOpen && user) {
      const fetchProfile = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setFormData(prev => ({
            ...prev,
            yourEmail: profile.email || user.email || '',
            yourName: profile.full_name || '',
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            yourEmail: user.email || '',
            yourName: user.user_metadata?.full_name || user.user_metadata?.name || '',
          }));
        }
      };
      fetchProfile();
    }
  }, [isOpen, user]);

  // Only show parameters that aren't auto-filled
  const visibleParams = useMemo(() => {
    if (!workflow) return [];
    return workflow.parameters.filter((p) => !AUTO_FIELDS.has(p.name));
  }, [workflow]);

  const validateSalesforceId = (value: string) => {
    if (value && value.length !== 18) {
      setSfIdError("Salesforce ID must be exactly 18 characters");
      return false;
    }
    setSfIdError("");
    return true;
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "salesforceAccountId" || name === "salesforceOpportunityId") {
      validateSalesforceId(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sfField = formData.salesforceAccountId || formData.salesforceOpportunityId || "";
    const sfValid = sfField ? validateSalesforceId(sfField) : true;
    if (workflow && sfValid) {
      onSubmit(workflow, formData);
    }
  };

  const handleClose = () => {
    setFormData({});
    setSfIdError("");
    onClose();
  };

  if (!workflow) return null;

  const hasVisibleFields = visibleParams.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <workflow.icon className="h-5 w-5 text-primary" />
            </div>
            <span>Launch {workflow.title}</span>
          </DialogTitle>
          <DialogDescription>
            {hasVisibleFields
              ? "Choose the account to run this workflow for."
              : "Ready to launch — we'll use your profile details automatically."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {visibleParams.map((param) => (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>
                {param.label}
                {param.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {param.type === 'textarea' ? (
                <Textarea
                  id={param.name}
                  placeholder={param.placeholder}
                  required={param.required}
                  value={formData[param.name] || ''}
                  onChange={(e) => handleInputChange(param.name, e.target.value)}
                  className="min-h-[80px]"
                />
              ) : (
                <>
                  <Input
                    id={param.name}
                    type={param.type}
                    placeholder={param.placeholder}
                    required={param.required}
                    value={formData[param.name] || ''}
                    onChange={(e) => handleInputChange(param.name, e.target.value)}
                    className={
                      (param.name === "salesforceAccountId" || param.name === "salesforceOpportunityId") && sfIdError
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {(param.name === "salesforceAccountId" || param.name === "salesforceOpportunityId") && sfIdError && (
                    <p className="text-sm text-destructive mt-1">{sfIdError}</p>
                  )}
                </>
              )}
            </div>
          ))}

          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !!sfIdError}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Launching...
                </>
              ) : (
                'Launch Workflow'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowForm;
