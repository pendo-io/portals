import { useQuery } from "@tanstack/react-query";
import { fetchMeetings } from "@/services/momentum";

function getDevUserEmail(): string {
  const stored = localStorage.getItem("sfdc_dev_session");
  if (!stored) return "";
  try {
    return JSON.parse(stored).email || "";
  } catch {
    return "";
  }
}

export function useMeetings(dateRange?: { from: string; to: string }) {
  const email = getDevUserEmail();

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const defaultTo = now.toISOString().split("T")[0];

  const from = dateRange?.from || defaultFrom;
  const to = dateRange?.to || defaultTo;

  return useQuery({
    queryKey: ["momentum-meetings", email, from, to],
    queryFn: () => fetchMeetings(email, from, to),
    enabled: !!email,
    staleTime: 5 * 60 * 1000,
  });
}
