import type { MomentumMeeting } from "@/types/meeting";

async function momentumFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const res = await fetch("/api/momentum-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, params }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Momentum API error ${res.status}: ${errorBody}`);
  }

  return res.json();
}

export async function fetchMeetings(
  email: string,
  from: string,
  to: string
): Promise<MomentumMeeting[]> {
  const data = await momentumFetch<{ meetings: MomentumMeeting[] } | MomentumMeeting[]>(
    "/meetings",
    { attendeeEmailAddresses: email, from, to }
  );
  return Array.isArray(data) ? data : data.meetings ?? [];
}
