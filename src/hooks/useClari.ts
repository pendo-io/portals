import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchClariOpportunities,
  aggregateAccountSummary,
  queueForecastExport,
  checkExportStatus,
  getExportResults,
} from "@/services/clari";
import type { ClariOpportunity, ClariForecastExportResult } from "@/types/clari";

export function useClariOpportunities(sfdcOppIds: string[]) {
  return useQuery<ClariOpportunity[]>({
    queryKey: ["clari-opportunities", sfdcOppIds],
    queryFn: () => fetchClariOpportunities(sfdcOppIds),
    enabled: sfdcOppIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClariAccountSummary(sfdcOppIds: string[], accountId: string) {
  const { data: opportunities, isLoading, error } = useClariOpportunities(sfdcOppIds);

  const summary: ClariAccountSummary | null =
    opportunities && opportunities.length > 0
      ? aggregateAccountSummary(accountId, opportunities)
      : null;

  return {
    summary,
    opportunities: opportunities || [],
    isLoading,
    error,
  };
}

export function useClariForecastExport() {
  const queryClient = useQueryClient();

  const queueMutation = useMutation({
    mutationFn: queueForecastExport,
  });

  const pollExport = async (exportId: string): Promise<ClariForecastExportResult> => {
    const maxAttempts = 30;
    const pollInterval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      const { status } = await checkExportStatus(exportId);

      if (status === "completed") {
        const results = await getExportResults(exportId);
        queryClient.invalidateQueries({ queryKey: ["clari-forecast"] });
        return results;
      }

      if (status === "failed") {
        throw new Error("Forecast export failed");
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    throw new Error("Forecast export timed out");
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      const { exportId } = await queueMutation.mutateAsync();
      return pollExport(exportId);
    },
  });

  return {
    startExport: exportMutation.mutate,
    exportData: exportMutation.data ?? null,
    isExporting: exportMutation.isPending,
    exportError: exportMutation.error,
  };
}
