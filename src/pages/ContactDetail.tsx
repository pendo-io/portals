import { useParams } from "react-router-dom";
import { useContactDetail } from "@/hooks/useContactDetail";
import { ContactDetailHeader } from "@/components/contacts/ContactDetailHeader";
import { ContactOverviewTab } from "@/components/contacts/tabs/ContactOverviewTab";
import { ContactAccountTab } from "@/components/contacts/tabs/ContactAccountTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const {
    contact,
    contactLoading,
    opportunities,
    opportunitiesLoading,
  } = useContactDetail(contactId);

  if (contactLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading contact...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Contact not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ContactDetailHeader contact={contact} />

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-3 sm:px-6 overflow-x-auto">
          <TabsList className="h-11 bg-transparent p-0 gap-6 w-max sm:w-auto">
            <TabsTrigger value="overview" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm text-muted-foreground font-normal data-[state=active]:font-medium">
              Overview
            </TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm text-muted-foreground font-normal data-[state=active]:font-medium">
              Account
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="overview" className="m-0 p-6">
            <ContactOverviewTab contact={contact} />
          </TabsContent>
          <TabsContent value="account" className="m-0 p-6">
            <ContactAccountTab
              contact={contact}
              opportunities={opportunities}
              opportunitiesLoading={opportunitiesLoading}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
