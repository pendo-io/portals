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

interface MeetingParticipantsTabProps {
  meeting: MomentumMeeting;
}

export function MeetingParticipantsTab({ meeting }: MeetingParticipantsTabProps) {
  const attendees = meeting.attendees ?? [];

  if (attendees.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No participant data available
      </div>
    );
  }

  const internal = attendees.filter((a) => a.isInternal);
  const external = attendees.filter((a) => !a.isInternal);

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-3">
        <Badge variant="secondary">{internal.length} Internal</Badge>
        <Badge variant="outline">{external.length} External</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendees.map((attendee, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">
                {attendee.name || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {attendee.email}
              </TableCell>
              <TableCell>
                <Badge
                  variant={attendee.isInternal ? "secondary" : "outline"}
                  className="font-normal"
                >
                  {attendee.isInternal ? "Internal" : "External"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
