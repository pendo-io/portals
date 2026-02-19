import { useParams } from "react-router-dom";
import { useAccountDetail } from "@/hooks/useAccountDetail";
import { AccountDetailHeader } from "@/components/accounts/AccountDetailHeader";
import { AccountOverviewTab } from "@/components/accounts/tabs/AccountOverviewTab";
import { AccountContactsTab } from "@/components/accounts/tabs/AccountContactsTab";
import { AccountOpportunitiesTab } from "@/components/accounts/tabs/AccountOpportunitiesTab";
import { AccountWorkflowsTab } from "@/components/accounts/tabs/AccountWorkflowsTab";
import { AccountSignalsTab } from "@/components/accounts/tabs/AccountSignalsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { workflows as allWorkflows } from "@/data/workflows";

const ACCOUNT_WORKFLOW_COUNT = allWorkflows.filter(
  (w) =>
    !w.parameters.some((p) => p.name === "salesforceOpportunityId") &&
    w.parameters.some((p) => p.name === "clientName")
).length;

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const {
    account,
    accountLoading,
    contacts,
    contactsLoading,
    opportunities,
    opportunitiesLoading,
  } = useAccountDetail(accountId);

  if (accountLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading account...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Account not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AccountDetailHeader account={account} />

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-3 sm:px-6 overflow-x-auto">
          <TabsList className="h-11 bg-transparent p-0 gap-6 w-max sm:w-auto">
            <TabsTrigger value="overview" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm text-muted-foreground font-normal data-[state=active]:font-medium">
              Overview
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm text-muted-foreground font-normal data-[state=active]:font-medium gap-1.5">
              <span className="hidden sm:inline">Opportunities</span>
              <span className="sm:hidden">Opps</span>
              {opportunities.length > 0 && <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">{opportunities.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm text-muted-foreground font-normal data-[state=active]:font-medium gap-1.5">
              Contacts
              {contacts.length > 0 && <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">{contacts.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="signals" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm text-muted-foreground font-normal data-[state=active]:font-medium gap-1.5">
              Signals
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">5</span>
            </TabsTrigger>
            <TabsTrigger value="workflows" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm text-muted-foreground font-normal data-[state=active]:font-medium whitespace-nowrap gap-1.5">
              Workflows
              {ACCOUNT_WORKFLOW_COUNT > 0 && <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">{ACCOUNT_WORKFLOW_COUNT}</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="opportunities" className="m-0">
            <AccountOpportunitiesTab opportunities={opportunities} loading={opportunitiesLoading} />
          </TabsContent>
          <TabsContent value="overview" className="m-0 p-6">
            <AccountOverviewTab account={account} contacts={contacts} opportunities={opportunities} />
          </TabsContent>
          <TabsContent value="contacts" className="m-0">
            <AccountContactsTab contacts={contacts} loading={contactsLoading} />
          </TabsContent>
          <TabsContent value="signals" className="m-0 p-3 sm:p-6">
            <AccountSignalsTab account={account} />
          </TabsContent>
          <TabsContent value="workflows" className="m-0 p-6">
            <AccountWorkflowsTab account={account} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
