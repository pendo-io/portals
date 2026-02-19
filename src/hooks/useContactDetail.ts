import { useQuery } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { fetchContact, fetchOpportunities } from "@/services/salesforce";
import type { SFDCContact, SFDCOpportunity } from "@/types/salesforce";

export function useContactDetail(contactId: string | undefined) {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcLoading } = useSalesforce();

  const hasSfdc = !!sfdcAccessToken && !!sfdcInstanceUrl;

  const contactQuery = useQuery({
    queryKey: ["sfdc-contact", contactId],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl || !contactId) return null;
      return fetchContact(sfdcAccessToken, sfdcInstanceUrl, contactId) as Promise<SFDCContact | null>;
    },
    enabled: hasSfdc && !!contactId && !sfdcLoading,
    staleTime: 5 * 60 * 1000,
  });

  const accountId = contactQuery.data?.AccountId;

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

  return {
    contact: contactQuery.data,
    contactLoading: contactQuery.isLoading || sfdcLoading,
    opportunities: opportunitiesQuery.data || [],
    opportunitiesLoading: opportunitiesQuery.isLoading,
  };
}
