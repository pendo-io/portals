import { useQuery } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { sfdcQuery } from "@/lib/sfdc";

export interface SfdcApprovalStep {
  Id: string;
  StepStatus: string;
  Comments: string | null;
  CreatedDate: string;
  Actor: { Name: string } | null;
  OriginalActor: { Name: string } | null;
}

export function useSfdcApprovalHistory(targetObjectId: string | undefined) {
  const { sfdcAccessToken, sfdcInstanceUrl } = useSalesforce();

  return useQuery({
    queryKey: ["sfdc-approval-history", targetObjectId],
    queryFn: () =>
      sfdcQuery<SfdcApprovalStep>(
        `SELECT Id, StepStatus, Comments, CreatedDate,
                Actor.Name, OriginalActor.Name
         FROM ProcessInstanceStep
         WHERE ProcessInstance.TargetObjectId = '${targetObjectId}'
         ORDER BY CreatedDate DESC`,
        sfdcInstanceUrl!,
        sfdcAccessToken!
      ),
    enabled: !!sfdcAccessToken && !!sfdcInstanceUrl && !!targetObjectId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
