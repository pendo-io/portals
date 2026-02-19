import { useQueryClient } from "@tanstack/react-query";
import type { MomentumMeeting } from "@/types/meeting";

export function useMeetingDetail(meetingId: string | undefined) {
  const queryClient = useQueryClient();

  // Look up the meeting from the cached meetings list
  const cachedQueries = queryClient.getQueriesData<MomentumMeeting[]>({
    queryKey: ["momentum-meetings"],
  });

  let meeting: MomentumMeeting | null = null;
  for (const [, data] of cachedQueries) {
    if (data) {
      const found = data.find((m) => m.id === meetingId);
      if (found) {
        meeting = found;
        break;
      }
    }
  }

  return {
    meeting,
    isLoading: false,
    error: !meeting && meetingId ? new Error("Meeting not found in cache") : null,
  };
}
