import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountLogo } from "@/components/accounts/AccountLogo";
import { Building2, Globe, Phone, DollarSign, ExternalLink } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { SFDCContact, SFDCOpportunity } from "@/types/salesforce";

interface ContactAccountTabProps {
  contact: SFDCContact;
  opportunities: SFDCOpportunity[];
  opportunitiesLoading: boolean;
}

export function ContactAccountTab({ contact, opportunities, opportunitiesLoading }: ContactAccountTabProps) {
  const navigate = useNavigate();
  const account = contact.Account;

  if (!account) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No account associated with this contact
      </div>
    );
  }

  const openOpps = opportunities.filter(
    (o) => !["Closed Won", "Closed Lost"].includes(o.StageName)
  );
  const totalPipelineValue = openOpps.reduce((sum, opp) => sum + (opp.Amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Account card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Parent Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AccountLogo domain={account.Domain_Name__c ?? null} name={account.Name} size="lg" />
              <div>
                <p className="font-medium">{account.Name}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                  {account.Industry && <span>{account.Industry}</span>}
                  {account.Website && (
                    <a
                      href={account.Website.startsWith("http") ? account.Website : `https://${account.Website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      {account.Website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  {account.Phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {account.Phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/accounts/${account.Id}`)}
            >
              View Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Account Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {opportunitiesLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No opportunities found for this account.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Opportunities</span>
                <span className="font-medium">{opportunities.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Opportunities</span>
                <span className="font-medium">{openOpps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Pipeline Value</span>
                <span className="font-medium">${totalPipelineValue.toLocaleString()}</span>
              </div>
              {openOpps.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                  {openOpps.slice(0, 5).map((opp) => (
                    <div key={opp.Id} className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{opp.Name}</p>
                        <p className="text-xs text-muted-foreground">
                          {opp.StageName} &middot; Close {new Date(opp.CloseDate).toLocaleDateString()}
                        </p>
                      </div>
                      {opp.Amount && (
                        <span className="text-sm font-medium shrink-0 ml-3">
                          ${opp.Amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                  {openOpps.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{openOpps.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
