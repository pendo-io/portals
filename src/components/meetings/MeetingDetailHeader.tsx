import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Users, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { MomentumMeeting } from "@/types/meeting";

interface MeetingDetailHeaderProps {
  meeting: MomentumMeeting;
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function MeetingDetailHeader({ meeting }: MeetingDetailHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="border-b px-6 py-5 bg-card/30">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate("/meetings")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-page-title">
              {meeting.title || "Untitled Meeting"}
            </h1>
            {meeting.sentiment && (
              <Badge variant="secondary">{meeting.sentiment}</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap ml-11">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(meeting.startTime).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(meeting.startTime).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              - {" "}
              {new Date(meeting.endTime).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              ({formatDuration(meeting.startTime, meeting.endTime)})
            </span>
            {meeting.host && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {meeting.host.name || meeting.host.email}
              </span>
            )}
            {meeting.attendees && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {meeting.attendees.length} participants
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
