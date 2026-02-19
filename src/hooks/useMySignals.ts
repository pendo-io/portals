import { useMemo } from "react";
import { MOCK_SIGNALS } from "@/data/mockSignals";
import type { Signal } from "@/data/mockSignals";
import type { SFDCAccount } from "@/types/salesforce";

/**
 * Maps mock signals onto the logged-in user's real accounts.
 * Each unique mock accountId is assigned a real account (cycling through
 * the list), so the signal cards display the user's actual account names,
 * domains, and IDs.
 */
export function useMySignals(accounts: SFDCAccount[] | undefined): Signal[] {
  return useMemo(() => {
    if (!accounts || accounts.length === 0) return MOCK_SIGNALS;

    // Build a stable mapping: each unique mock accountId → a real account
    const uniqueMockIds = [...new Set(MOCK_SIGNALS.map((s) => s.accountId))];
    const idMap = new Map<string | null, SFDCAccount>();
    uniqueMockIds.forEach((mockId, i) => {
      idMap.set(mockId, accounts[i % accounts.length]);
    });

    return MOCK_SIGNALS.map((signal) => {
      const acct = idMap.get(signal.accountId);
      if (!acct) return signal;

      const domain =
        acct.Domain_Name__c ||
        acct.Website?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ||
        null;

      return {
        ...signal,
        accountName: acct.Name,
        accountDomain: domain,
        accountId: acct.Id,
        accountType: acct.Type,
        accountOwner: acct.Owner?.Name || signal.accountOwner,
      };
    });
  }, [accounts]);
}
