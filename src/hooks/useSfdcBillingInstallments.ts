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

// TODO: Add Referral_Commission_Amount__c and Referral_Commission_Payment_Status__c once Surya creates them
const BI_FIELDS = `Id, Name, Installment_Date__c, Installments_Total_Amount__c`;

export function useSfdcBillingInstallments(oppId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sfdc-billing-installments", oppId],
    queryFn: () =>
      sfdcQuery<SfdcBillingInstallment>(
        `SELECT ${BI_FIELDS}
         FROM Billing_Installment__c
         WHERE Quote__r.SBQQ__Opportunity2__c = '${oppId}' AND Quote__r.SBQQ__Primary__c = true
         ORDER BY Installment_Date__c ASC`
      ),
    enabled: !!user && !!oppId && isSafeSfdcId(oppId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
