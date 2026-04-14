import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePortalType } from "@/hooks/usePortalType";
import { useAuth } from "@/hooks/useAuth";
import { sfdcCreate } from "@/lib/sfdc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { CheckCircle2, Loader2, UploadCloud, Info } from "lucide-react";

const initial = {
  company: "",
  website: "",
  firstName: "",
  lastName: "",
  email: "",
  title: "",
  departments: "",
  useCase: "",
  numberOfUsers: "",
  currentTechStack: "",
  competitors: "",
  additionalInfo: "",
};

type FormData = typeof initial;

const REQUIRED: (keyof FormData)[] = ["company", "website", "lastName", "email", "title", "useCase"];

const PartnerReferralForm = () => {
  useDocumentTitle("Lead Referral Form");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session, sfdcAccountId, partnerOwnerId } = useAuth();
  const { t } = usePortalType();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>(initial);
  const [shakeFields, setShakeFields] = useState<Set<string>>(new Set());

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setSelect = (field: keyof FormData) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submitMutation = useMutation({
    mutationFn: (fields: Record<string, unknown>) =>
      sfdcCreate("Lead", fields, session?.access_token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sfdc-leads"] });
      setSubmitted(true);
      toast.success("Referral submitted successfully");
    },
    onError: (err: Error) => {
      console.error("Failed to create lead:", err);
      toast.error(err.message || "Failed to submit referral");
    },
  });

  const handleSubmit = () => {
    if (submitMutation.isPending) return;
    if (!user) { toast.error("Not authenticated"); return; }

    const missing = REQUIRED.filter((f) => !form[f]);
    if (missing.length > 0) {
      setShakeFields(new Set(missing));
      setTimeout(() => setShakeFields(new Set()), 600);
      toast.error("Please fill in all required fields");
      return;
    }

    if (form.website) {
      const url = form.website.startsWith("http") ? form.website : `https://${form.website}`;
      let valid = false;
      try { valid = Boolean(new URL(url).hostname.includes(".")); } catch {}
      if (!valid || form.website.length > 255) {
        setShakeFields(new Set(["website"]));
        setTimeout(() => setShakeFields(new Set()), 600);
        toast.error(form.website.length > 255 ? "Website must be 255 characters or less" : "Please enter a valid URL (e.g. acme.com)");
        return;
      }
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setShakeFields(new Set(["email"]));
      setTimeout(() => setShakeFields(new Set()), 600);
      toast.error("Please enter a valid email address");
      return;
    }

    const fields: Record<string, unknown> = {
      Company: form.company,
      Website: form.website,
      FirstName: form.firstName || null,
      LastName: form.lastName,
      Email: form.email,
      Title: form.title,
      LeadSource: "Partner Referral",
      Status: "Pending",
      Referral_Partner_Account__c: sfdcAccountId || null,
      Partner_Owner__c: partnerOwnerId || null,
      Department_s__c: form.departments || null,
      Use_Case__c: form.useCase || null,
      Number_of_Users__c: form.numberOfUsers ? Number(form.numberOfUsers) : null,
      Current_Tech_Stack_Solutions__c: form.currentTechStack || null,
      Competitors_Considered_or_Incumbent__c: form.competitors || null,
      Additional_Information__c: form.additionalInfo || null,
    };

    for (const key of Object.keys(fields)) {
      if (fields[key] === null) delete fields[key];
    }

    submitMutation.mutate(fields);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
      e.preventDefault();
      handleSubmit();
    }
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t("Referral Submitted")}</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              {t("Thank you for your partnership with Pendo! We will review and strive to respond within 2 business days.")}
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => { setSubmitted(false); setForm(initial); }}>
              {t("Submit Another")}
            </Button>
            <Button onClick={() => navigate("/")}>
              {t("Back to Home")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" onKeyDown={handleKeyDown}>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

          {/* Page heading */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">{t("Submit a Lead")}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UploadCloud className="h-4 w-4 shrink-0" />
              <span>
                {t("Have multiple leads?")}{" "}
                <Link to="/bulk" className="text-primary hover:underline font-medium">
                  {t("Upload them in bulk")}
                </Link>
              </span>
            </div>
          </div>

          {/* Company */}
          <FormSection label={t("Company")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("Company")} required shake={shakeFields.has("company")}>
                <Input value={form.company} onChange={set("company")} placeholder="Acme Inc" autoFocus />
              </Field>
              <Field label={t("Website")} required shake={shakeFields.has("website")}>
                <Input maxLength={255} value={form.website} onChange={set("website")} placeholder="acme.com" />
              </Field>
            </div>
          </FormSection>

          {/* Contact */}
          <FormSection label={t("Contact")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("First Name")}>
                <Input value={form.firstName} onChange={set("firstName")} placeholder="First name" />
              </Field>
              <Field label={t("Last Name")} required shake={shakeFields.has("lastName")}>
                <Input value={form.lastName} onChange={set("lastName")} placeholder="Last name" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("Email")} required shake={shakeFields.has("email")}>
                <Input type="email" value={form.email} onChange={set("email")} placeholder="name@company.com" />
              </Field>
              <Field label={t("Title")} required shake={shakeFields.has("title")}>
                <Input value={form.title} onChange={set("title")} placeholder="e.g. VP of Product" />
              </Field>
            </div>
            <Field label={t("Department(s)")}>
              <Input value={form.departments} onChange={set("departments")} placeholder="e.g. Product, Eng" />
            </Field>
          </FormSection>

          {/* Opportunity */}
          <FormSection label={t("Opportunity")}>
            <Field label={t("Use Case")} required shake={shakeFields.has("useCase")}>
              <Select value={form.useCase} onValueChange={setSelect("useCase")}>
                <SelectTrigger><SelectValue placeholder="Select use case" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendo for Customers">Pendo for Customers</SelectItem>
                  <SelectItem value="Pendo for Employees">Pendo for Employees</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={t("Number of Active Users")}
                tooltip={t("The number of end users who actively use the product being referred — not total employees.")}
              >
                <Input type="number" value={form.numberOfUsers} onChange={set("numberOfUsers")} placeholder="e.g. 500" />
              </Field>
              <Field label={t("Current Tech Stack")}>
                <Input value={form.currentTechStack} onChange={set("currentTechStack")} placeholder="e.g. Amplitude, Intercom" />
              </Field>
            </div>
            <Field label={t("Competitors Considered or Incumbent")}>
              <Input value={form.competitors} onChange={set("competitors")} placeholder="Any competing or existing solutions?" />
            </Field>
            <Field label={t("Additional Information")}>
              <Textarea value={form.additionalInfo} onChange={set("additionalInfo")} placeholder="Anything else that would help us..." rows={3} />
            </Field>
          </FormSection>

        </div>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t border-border/50 px-6 py-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary">*</span> Required fields
        </p>
        <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="min-w-[140px] gap-1.5">
          {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitMutation.isPending ? t("Submitting...") : t("Submit Referral")}
        </Button>
      </div>
    </div>
  );
};

/* ── Shared Components ── */

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 shrink-0">
          {label}
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, shake, tooltip, children }: { label: string; required?: boolean; shake?: boolean; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-2 ${shake ? "animate-shake" : ""}`}>
      <div className="flex items-center gap-1.5">
        <Label className="text-sm text-muted-foreground font-medium">
          {label}
          {required && <span className="text-primary ml-0.5">*</span>}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-default shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-56 text-xs leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

export default PartnerReferralForm;
