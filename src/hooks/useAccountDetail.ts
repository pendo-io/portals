import { useQuery } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccount, fetchContacts, fetchOpportunities } from "@/services/salesforce";
import type { SFDCAccount, SFDCContact, SFDCOpportunity } from "@/types/salesforce";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

export function useAccountDetail(accountId: string | undefined) {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcLoading } = useSalesforce();
  const { user } = useAuth();

  const hasSfdc = !!sfdcAccessToken && !!sfdcInstanceUrl;

  const accountQuery = useQuery({
    queryKey: ["sfdc-account", accountId],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl || !accountId) return null;
      return fetchAccount(sfdcAccessToken, sfdcInstanceUrl, accountId) as Promise<SFDCAccount | null>;
    },
    enabled: hasSfdc && !!accountId && !sfdcLoading,
    staleTime: 5 * 60 * 1000,
  });

  const contactsQuery = useQuery({
    queryKey: ["sfdc-contacts", accountId],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl || !accountId) return [];
      const result = await fetchContacts(sfdcAccessToken, sfdcInstanceUrl, accountId);
      return result.records as SFDCContact[];
    },
    enabled: hasSfdc && !!accountId && !sfdcLoading,
    staleTime: 5 * 60 * 1000,
  });

  const opportunitiesQuery = useQuery({
    queryKey: ["sfdc-opportunities", accountId],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl || !accountId) return [];
      const result = await fetchOpportunities(sfdcAccessToken, sfdcInstanceUrl, accountId);
      return result.records as SFDCOpportunity[];
    },
    enabled: hasSfdc && !!accountId && !sfdcLoading,
    staleTime: 5 * 60 * 1000,
  });

  const reportsQuery = useQuery({
    queryKey: ["account-reports", accountId],
    queryFn: async () => {
      if (DEV_BYPASS) return [];
      if (!user || !accountId) return [];
      const accountName = accountQuery.data?.Name;
      if (!accountName) return [];
      const { data } = await supabase
        .from("account_intelligence_reports")
        .select("id, client_name, report_type, created_at, is_favorite")
        .eq("user_id", user.id)
        .eq("client_name", accountName)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: DEV_BYPASS || (!!user && !!accountQuery.data?.Name),
    staleTime: 2 * 60 * 1000,
  });

  return {
    account: accountQuery.data,
    accountLoading: accountQuery.isLoading || sfdcLoading,
    contacts: contactsQuery.data || [],
    contactsLoading: contactsQuery.isLoading,
    opportunities: opportunitiesQuery.data || [],
    opportunitiesLoading: opportunitiesQuery.isLoading,
    reports: reportsQuery.data || [],
    reportsLoading: reportsQuery.isLoading,
  };
}
