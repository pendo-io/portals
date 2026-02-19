import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSalesforce } from "./useSalesforce";
import { fetchMyContacts, searchContacts } from "@/services/salesforce";
import type { SFDCContact } from "@/types/salesforce";

export function useContacts() {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId, sfdcLoading } = useSalesforce();

  return useQuery({
    queryKey: ["sfdc-contacts", sfdcUserId],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl || !sfdcUserId) {
        return [];
      }
      const result = await fetchMyContacts(sfdcAccessToken, sfdcInstanceUrl, sfdcUserId);
      return result.records as SFDCContact[];
    },
    enabled: !!sfdcAccessToken && !!sfdcInstanceUrl && !!sfdcUserId && !sfdcLoading,
    staleTime: 5 * 60 * 1000,
  });
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useSearchAllContacts(searchTerm: string, enabled: boolean) {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcLoading } = useSalesforce();
  const debouncedSearch = useDebounce(searchTerm, 400);

  return useQuery({
    queryKey: ["sfdc-search-contacts", debouncedSearch],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl) return [];
      const result = await searchContacts(sfdcAccessToken, sfdcInstanceUrl, debouncedSearch);
      return result.records as SFDCContact[];
    },
    enabled: enabled && debouncedSearch.trim().length >= 2 && !!sfdcAccessToken && !!sfdcInstanceUrl && !sfdcLoading,
    staleTime: 60 * 1000,
  });
}
