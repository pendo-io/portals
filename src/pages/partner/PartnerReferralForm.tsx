import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
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
import { toast } from "sonner";
import { CheckCircle2, Loader2, ArrowRight, ArrowLeft, CornerDownLeft } from "lucide-react";

const SECTIONS = ["Company", "Contact", "Address", "Opportunity"] as const;

const initial = {
  company: "",
  website: "",
  salutation: "",
  firstName: "",
  lastName: "",
  email: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  numberOfUsers: "",
  departments: "",
  currentTechStack: "",
  startDate: "",
  useCase: "",
  competitors: "",
  additionalInfo: "",
};

type FormData = typeof initial;

const requiredBySection: Record<number, (keyof FormData)[]> = {
  0: ["company", "website"],
  1: ["lastName", "email", "departments"],
  2: [],
  3: ["numberOfUsers", "currentTechStack", "startDate", "useCase"],
};

const PartnerReferralForm = () => {
  useDocumentTitle("Lead Referral Form");
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>(initial);
  const [shakeFields, setShakeFields] = useState<Set<string>>(new Set());

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setSelect = (field: keyof FormData) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validateStep = useCallback(() => {
    const required = requiredBySection[step] ?? [];
    const missing = required.filter((f) => !form[f]);
    if (missing.length > 0) {
      setShakeFields(new Set(missing));
      setTimeout(() => setShakeFields(new Set()), 600);
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  }, [step, form]);

  const next = () => {
    if (!validateStep()) return;
    if (step < SECTIONS.length - 1) setStep(step + 1);
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSubmitted(true);
    toast.success("Referral submitted successfully");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA") return;
      e.preventDefault();
      if (step < SECTIONS.length - 1) next();
      else handleSubmit();
    }
  };

  const progress = submitted ? 100 : ((step + 1) / SECTIONS.length) * 100;
  const isLast = step === SECTIONS.length - 1;

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col">
        <ProgressBar value={100} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Referral Submitted</h2>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Thank you for your partnership with Pendo! We will review and strive to respond within 2 business days.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => { setSubmitted(false); setForm(initial); setStep(0); }}>
                Submit Another
              </Button>
              <Button onClick={() => navigate("/portal/partner")}>
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" onKeyDown={handleKeyDown}>
      <ProgressBar value={progress} />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Lead Referral Registration</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {SECTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (i < step) setStep(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40 cursor-pointer" : "w-3 bg-border"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {step + 1} / {SECTIONS.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-lg" key={step}>
          {step === 0 && <CompanyStep form={form} set={set} shake={shakeFields} />}
          {step === 1 && <ContactStep form={form} set={set} setSelect={setSelect} shake={shakeFields} />}
          {step === 2 && <AddressStep form={form} set={set} shake={shakeFields} />}
          {step === 3 && <OpportunityStep form={form} set={set} setSelect={setSelect} shake={shakeFields} />}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-t border-border/50">
        <div>
          {step > 0 && (
            <Button variant="ghost" onClick={prev} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd>
            <CornerDownLeft className="h-3 w-3" />
          </span>
          {isLast ? (
            <Button onClick={handleSubmit} disabled={saving} className="gap-1.5 min-w-[140px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Submitting..." : "Submit Referral"}
            </Button>
          ) : (
            <Button onClick={next} className="gap-1.5">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Progress Bar ── */

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full bg-border/50 shrink-0">
      <div
        className="h-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

/* ── Step Components ── */

interface StepProps {
  form: FormData;
  set: (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setSelect?: (field: keyof FormData) => (value: string) => void;
  shake: Set<string>;
}

function CompanyStep({ form, set, shake }: StepProps) {
  return (
    <div className="space-y-8">
      <StepHeader title="Company Information" description="Tell us about the company you're referring." />
      <div className="space-y-5">
        <Field label="Company" required shake={shake.has("company")}>
          <Input value={form.company} onChange={set("company")} placeholder="Acme Inc" autoFocus />
        </Field>
        <Field label="Website" required shake={shake.has("website")}>
          <Input value={form.website} onChange={set("website")} placeholder="https://acme.com" />
        </Field>
      </div>
    </div>
  );
}

function ContactStep({ form, set, setSelect, shake }: StepProps) {
  return (
    <div className="space-y-8">
      <StepHeader title="Contact Details" description="Who should we reach out to at this company?" />
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Salutation">
            <Select value={form.salutation} onValueChange={setSelect!("salutation")}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mr.">Mr.</SelectItem>
                <SelectItem value="Ms.">Ms.</SelectItem>
                <SelectItem value="Mrs.">Mrs.</SelectItem>
                <SelectItem value="Dr.">Dr.</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="First Name">
            <Input value={form.firstName} onChange={set("firstName")} placeholder="First name" autoFocus />
          </Field>
          <Field label="Last Name" required shake={shake.has("lastName")}>
            <Input value={form.lastName} onChange={set("lastName")} placeholder="Last name" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" required shake={shake.has("email")}>
            <Input type="email" value={form.email} onChange={set("email")} placeholder="name@company.com" />
          </Field>
          <Field label="Department(s)" required shake={shake.has("departments")}>
            <Input value={form.departments} onChange={set("departments")} placeholder="e.g. Product, Eng" />
          </Field>
        </div>
      </div>
    </div>
  );
}

function AddressStep({ form, set }: StepProps) {
  return (
    <div className="space-y-8">
      <StepHeader title="Address" description="Optional. Where is this company located?" />
      <div className="space-y-5">
        <Field label="Street">
          <Input value={form.street} onChange={set("street")} placeholder="123 Main St" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <Input value={form.city} onChange={set("city")} placeholder="City" />
          </Field>
          <Field label="State / Province">
            <Input value={form.state} onChange={set("state")} placeholder="State" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Zip / Postal Code">
            <Input value={form.zip} onChange={set("zip")} placeholder="12345" />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={set("country")} placeholder="Country" />
          </Field>
        </div>
      </div>
    </div>
  );
}

function OpportunityStep({ form, set, setSelect, shake }: StepProps) {
  return (
    <div className="space-y-8">
      <StepHeader title="Opportunity Details" description="Help us understand the prospect's needs and timeline." />
      <div className="space-y-5">
        <Field label="Number of Users" required shake={shake.has("numberOfUsers")}>
          <Input value={form.numberOfUsers} onChange={set("numberOfUsers")} placeholder="e.g. 500" autoFocus />
        </Field>
        <Field label="Current Tech Stack / Solutions" required shake={shake.has("currentTechStack")}>
          <Textarea value={form.currentTechStack} onChange={set("currentTechStack")} placeholder="What tools are they currently using?" rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date" required shake={shake.has("startDate")}>
            <Input type="date" value={form.startDate} onChange={set("startDate")} />
          </Field>
          <Field label="Use Case" required shake={shake.has("useCase")}>
            <Select value={form.useCase} onValueChange={setSelect!("useCase")}>
              <SelectTrigger><SelectValue placeholder="Select use case" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="onboarding">User Onboarding</SelectItem>
                <SelectItem value="adoption">Feature Adoption</SelectItem>
                <SelectItem value="retention">Retention / Churn</SelectItem>
                <SelectItem value="analytics">Product Analytics</SelectItem>
                <SelectItem value="feedback">Customer Feedback</SelectItem>
                <SelectItem value="planning">Product Planning</SelectItem>
                <SelectItem value="change-management">Change Management</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Competitors Considered or Incumbent">
          <Textarea value={form.competitors} onChange={set("competitors")} placeholder="Any competing or existing solutions?" rows={2} />
        </Field>
        <Field label="Additional Information">
          <Textarea value={form.additionalInfo} onChange={set("additionalInfo")} placeholder="Anything else that would help us..." rows={2} />
        </Field>
      </div>
    </div>
  );
}

/* ── Shared Components ── */

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
    </div>
  );
}

function Field({ label, required, shake, children }: { label: string; required?: boolean; shake?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${shake ? "animate-shake" : ""}`}>
      <Label className="text-xs text-muted-foreground font-medium">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default PartnerReferralForm;
