import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { MomentumMeeting } from "@/types/meeting";

interface MeetingsTableProps {
  meetings: MomentumMeeting[];
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function sentimentColor(sentiment?: string): string {
  if (!sentiment) return "secondary";
  const lower = sentiment.toLowerCase();
  if (lower === "positive") return "default";
  if (lower === "negative") return "destructive";
  return "secondary";
}

export function MeetingsTable({ meetings }: MeetingsTableProps) {
  const navigate = useNavigate();

  if (meetings.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No meetings this week
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Participants</TableHead>
          <TableHead>Sentiment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((meeting) => (
          <TableRow
            key={meeting.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => navigate(`/meetings/${meeting.id}`)}
          >
            <TableCell>
              <div>
                <p className="font-medium">{meeting.title || "Untitled Meeting"}</p>
                {meeting.host && (
                  <p className="text-xs text-muted-foreground">
                    Host: {meeting.host.name || meeting.host.email}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm">
                {new Date(meeting.startTime).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <br />
              <span className="text-xs text-muted-foreground">
                {new Date(meeting.startTime).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm">
                {formatDuration(meeting.startTime, meeting.endTime)}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm">
                {meeting.attendees?.length ?? 0}
              </span>
            </TableCell>
            <TableCell>
              {meeting.sentiment ? (
                <Badge variant={sentimentColor(meeting.sentiment) as any} className="font-normal">
                  {meeting.sentiment}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">-</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
