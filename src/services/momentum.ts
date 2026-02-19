import type { MomentumMeeting } from "@/types/meeting";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

async function momentumFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(
    DEV_BYPASS
      ? `${window.location.origin}/momentum-api${path}`
      : `https://api.momentum.io/v1${path}`
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // In production, the API key would come via the edge function.
  // In dev mode, the Vite proxy injects the header automatically.

  const res = await fetch(url.toString(), { headers });

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