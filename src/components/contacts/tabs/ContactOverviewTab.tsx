import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, MapPin, Calendar } from "lucide-react";
import type { SFDCContact } from "@/types/salesforce";

interface ContactOverviewTabProps {
  contact: SFDCContact;
}

export function ContactOverviewTab({ contact }: ContactOverviewTabProps) {
  const location = [contact.MailingCity, contact.MailingState, contact.MailingCountry]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {contact.Title && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title</span>
              <span className="font-medium">{contact.Title}</span>
            </div>
          )}
          {contact.Department && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium">{contact.Department}</span>
            </div>
          )}
          {contact.Email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <a
                href={`mailto:${contact.Email}`}
                className="font-medium text-primary hover:underline flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                {contact.Email}
              </a>
            </div>
          )}
          {contact.Phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contact.Phone}
              </span>
            </div>
          )}
          {contact.MobilePhone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mobile</span>
              <span className="font-medium flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contact.MobilePhone}
              </span>
            </div>
          )}
          {location && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">
              {new Date(contact.CreatedDate).toLocaleDateString()}
            </span>
          </div>
          {contact.LastModifiedDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Modified</span>
              <span className="font-medium">
                {new Date(contact.LastModifiedDate).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Owner</span>
            <span className="font-medium">{contact.Owner?.Name || "-"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {contact.Description && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contact.Description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
