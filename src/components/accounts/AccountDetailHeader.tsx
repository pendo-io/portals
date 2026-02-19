import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Globe, Phone, MapPin, Users, DollarSign } from "lucide-react";
import { AccountLogo } from "@/components/accounts/AccountLogo";
import type { SFDCAccount } from "@/types/salesforce";

interface AccountDetailHeaderProps {
  account: SFDCAccount;
}

export function AccountDetailHeader({ account }: AccountDetailHeaderProps) {
  const location = [account.BillingCity, account.BillingState, account.BillingCountry]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="border-b px-3 sm:px-6 py-4 sm:py-5 bg-card/30">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <AccountLogo domain={account.Domain_Name__c} name={account.Name} size="lg" />
            <h1 className="text-page-title">{account.Name}</h1>
            {account.Type && (
              <Badge variant="secondary">{account.Type}</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {account.Industry && (
              <span>{account.Industry}</span>
            )}
            {account.Website && (
              <a
                href={account.Website.startsWith("http") ? account.Website : `https://${account.Website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                {account.Website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {account.Phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {account.Phone}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
            {account.NumberOfEmployees && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {account.NumberOfEmployees.toLocaleString()} employees
              </span>
            )}
            {account.AnnualRevenue && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                ${(account.AnnualRevenue / 1_000_000).toFixed(1)}M revenue
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://pendo--full.sandbox.lightning.force.com/${account.Id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              View in SFDC
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
