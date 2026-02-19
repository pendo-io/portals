import type { MomentumMeeting } from "@/types/meeting";

interface MeetingTranscriptTabProps {
  meeting: MomentumMeeting;
}

export function MeetingTranscriptTab({ meeting }: MeetingTranscriptTabProps) {
  const entries = meeting.transcript?.entries ?? [];

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No transcript available for this meeting
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="shrink-0 w-32 text-right">
            <span className="text-sm font-medium text-primary">
              {entry.speaker?.name || "Unknown"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground flex-1">{entry.text}</p>
        </div>
      ))}
    </div>
  );
}
