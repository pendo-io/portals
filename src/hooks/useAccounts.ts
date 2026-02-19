import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useSalesforce } from "./useSalesforce";
import { fetchAccounts, searchAccounts, fetchOpenOpportunitiesByOwner } from "@/services/salesforce";
import { useClariOpportunities } from "./useClari";
import type { SFDCAccount, SFDCOpportunity } from "@/types/salesforce";

export function useAccounts() {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId, sfdcLoading } = useSalesforce();

  return useQuery({
    queryKey: ["sfdc-accounts", sfdcUserId],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl || !sfdcUserId) {
        return [];
      }
      const result = await fetchAccounts(sfdcAccessToken, sfdcInstanceUrl, sfdcUserId);
      return result.records as SFDCAccount[];
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

export function useSearchAllAccounts(searchTerm: string, enabled: boolean) {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcLoading } = useSalesforce();
  const debouncedSearch = useDebounce(searchTerm, 400);

  return useQuery({
    queryKey: ["sfdc-search-accounts", debouncedSearch],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl) return [];
      const result = await searchAccounts(sfdcAccessToken, sfdcInstanceUrl, debouncedSearch);
      return result.records as SFDCAccount[];
    },
    enabled: enabled && debouncedSearch.trim().length >= 2 && !!sfdcAccessToken && !!sfdcInstanceUrl && !sfdcLoading,
    staleTime: 60 * 1000,
  });
}

export function useNextOpportunities() {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId, sfdcLoading } = useSalesforce();

  const { data: openOpps, isLoading } = useQuery({
    queryKey: ["sfdc-open-opps-by-owner", sfdcUserId],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl || !sfdcUserId) return [];
      const result = await fetchOpenOpportunitiesByOwner(sfdcAccessToken, sfdcInstanceUrl, sfdcUserId);
      return result.records as SFDCOpportunity[];
    },
    enabled: !!sfdcAccessToken && !!sfdcInstanceUrl && !!sfdcUserId && !sfdcLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Group by AccountId, pick the first (soonest close date since query is ordered ASC)
  const nextOppMap = useMemo(() => {
    const map = new Map<string, SFDCOpportunity>();
    if (openOpps) {
      for (const opp of openOpps) {
        if (!map.has(opp.AccountId)) {
          map.set(opp.AccountId, opp);
        }
      }
    }
    return map;
  }, [openOpps]);

  // Collect opp IDs for Clari score lookup
  const nextOppIds = useMemo(() => Array.from(nextOppMap.values()).map((o) => o.Id), [nextOppMap]);
  const { data: clariOpps } = useClariOpportunities(nextOppIds);

  const clariScoreMap = useMemo(() => {
    const map = new Map<string, number | null>();
    if (clariOpps) {
      for (const co of clariOpps) {
        map.set(co.oppId, co.clariScore);
      }
    }
    return map;
  }, [clariOpps]);

  return { nextOppMap, clariScoreMap, isLoading };
}
