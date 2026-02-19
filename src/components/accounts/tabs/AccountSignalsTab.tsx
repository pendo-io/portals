import { useMemo } from "react";
import { SignalCard } from "@/components/signals/SignalCard";
import type { Signal } from "@/data/mockSignals";
import type { SFDCAccount } from "@/types/salesforce";

interface AccountSignalsTabProps {
  account: SFDCAccount;
}

function generateAccountSignals(account: SFDCAccount): Signal[] {
  const domain = account.Domain_Name__c || account.Website?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null;
  const owner = account.Owner?.Name || "Account Owner";

  return [
    {
      id: `${account.Id}-sig-1`,
      accountName: account.Name,
      accountDomain: domain,
      accountId: account.Id,
      accountType: account.Type,
      accountOwner: owner,
      accountOwnerEmail: "",
      title: "New Hot Account",
      signalType: "6sense New Hot Account",
      source: "6sense",
      publishDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      linkedinUrl: null,
      crmLink: null,
      contactName: null,
      contactTitle: null,
      contactId: null,
      metaData: null,
    },
    {
      id: `${account.Id}-sig-2`,
      accountName: account.Name,
      accountDomain: domain,
      accountId: account.Id,
      accountType: account.Type,
      accountOwner: owner,
      accountOwnerEmail: "",
      title: "Sarah Chen",
      signalType: "Sixth Sense Contact Engagement",
      source: "6sense",
      publishDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      linkedinUrl: "https://www.linkedin.com/in/sarahchen",
      crmLink: null,
      contactName: "Sarah Chen",
      contactTitle: "VP of Product",
      contactId: null,
      metaData: { personName: "Sarah Chen", title: "VP of Product", visited: "pricing page, demo request" },
    },
    {
      id: `${account.Id}-sig-3`,
      accountName: account.Name,
      accountDomain: domain,
      accountId: account.Id,
      accountType: account.Type,
      accountOwner: owner,
      accountOwnerEmail: "",
      title: "Director of Engineering",
      signalType: "Hiring",
      source: "Clay",
      publishDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      linkedinUrl: "https://www.linkedin.com/in/alexrivera",
      crmLink: null,
      contactName: "Alex Rivera",
      contactTitle: "Director of Engineering",
      contactId: null,
      metaData: { full_name: "Alex Rivera", job_start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    },
    {
      id: `${account.Id}-sig-4`,
      accountName: account.Name,
      accountDomain: domain,
      accountId: account.Id,
      accountType: account.Type,
      accountOwner: owner,
      accountOwnerEmail: "",
      title: "Web visit activity",
      signalType: "Sixth Sense Recent Web Visits",
      source: "6sense",
      publishDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      linkedinUrl: null,
      crmLink: null,
      contactName: null,
      contactTitle: null,
      contactId: null,
      metaData: { pages: ["pricing", "case-studies", "product-analytics"] },
    },
    {
      id: `${account.Id}-sig-5`,
      accountName: account.Name,
      accountDomain: domain,
      accountId: account.Id,
      accountType: account.Type,
      accountOwner: owner,
      accountOwnerEmail: "",
      title: "Intent activity: digital adoption",
      signalType: "Sixth Sense Recent Intent Activities",
      source: "6sense",
      publishDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      linkedinUrl: null,
      crmLink: null,
      contactName: null,
      contactTitle: null,
      contactId: null,
      metaData: { keywords: ["digital adoption", "product analytics", "user onboarding"] },
    },
  ];
}

export function AccountSignalsTab({ account }: AccountSignalsTabProps) {
  const signals = useMemo(() => generateAccountSignals(account), [account]);

  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  );
}
