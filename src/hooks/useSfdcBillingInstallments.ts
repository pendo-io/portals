import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId } from "@/lib/sfdc";

export interface SfdcBillingInstallment {
  Id: string;
  Name: string;
  Installment_Date__c: string | null;
  Installments_Total_Amount__c: number | null;
  Referral_Commission_Amount__c: number | null;
  Referral_Commission_Payment_Status__c: string | null;
}

export function useSfdcBillingInstallments(oppId: string | undefined) {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ["sfdc-billing-installments", oppId],
    queryFn: () =>
      sfdcQuery<SfdcBillingInstallment>("billing-installments", { oppId }, {
        accessToken: session?.access_token,
      }),
    enabled: !!user && !!oppId && isSafeSfdcId(oppId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
