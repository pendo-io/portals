import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, Phone, MapPin, Building2, Briefcase } from "lucide-react";
import { AccountLogo } from "@/components/accounts/AccountLogo";
import { useNavigate } from "react-router-dom";
import type { SFDCContact } from "@/types/salesforce";

interface ContactDetailHeaderProps {
  contact: SFDCContact;
}

export function ContactDetailHeader({ contact }: ContactDetailHeaderProps) {
  const navigate = useNavigate();
  const location = [contact.MailingCity, contact.MailingState, contact.MailingCountry]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="border-b px-3 sm:px-6 py-4 sm:py-5 bg-card/30">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <AccountLogo domain={contact.Account?.Domain_Name__c ?? null} name={contact.Account?.Name || contact.Name} size="lg" />
            <h1 className="text-page-title">{contact.Name}</h1>
            {contact.Department && (
              <Badge variant="secondary">{contact.Department}</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {contact.Account && (
              <button
                onClick={() => navigate(`/accounts/${contact.Account!.Id}`)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Building2 className="h-3.5 w-3.5" />
                {contact.Account.Name}
              </button>
            )}
            {contact.Title && (
              <span>{contact.Title}</span>
            )}
            {contact.Email && (
              <a
                href={`mailto:${contact.Email}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {contact.Email}
              </a>
            )}
            {contact.Phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {contact.Phone}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
            {contact.Owner?.Name && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {contact.Owner.Name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://pendo--full.sandbox.lightning.force.com/${contact.Id}`}
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
