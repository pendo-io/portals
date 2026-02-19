import { useParams } from "react-router-dom";
import { useMeetingDetail } from "@/hooks/useMeetingDetail";
import { MeetingDetailHeader } from "@/components/meetings/MeetingDetailHeader";
import { MeetingOverviewTab } from "@/components/meetings/tabs/MeetingOverviewTab";
import { MeetingParticipantsTab } from "@/components/meetings/tabs/MeetingParticipantsTab";
import { MeetingTranscriptTab } from "@/components/meetings/tabs/MeetingTranscriptTab";
import { MeetingWorkflowsTab } from "@/components/meetings/tabs/MeetingWorkflowsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function MeetingDetail() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { meeting, isLoading } = useMeetingDetail(meetingId);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Meeting not found</p>
      </div>
    );
  }

  const participantCount = meeting.attendees?.length ?? 0;
  const hasTranscript = (meeting.transcript?.entries?.length ?? 0) > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MeetingDetailHeader meeting={meeting} />

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-6">
          <TabsList className="h-10 bg-transparent p-0 gap-4">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="participants"
              className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2"
            >
              Participants ({participantCount})
            </TabsTrigger>
            <TabsTrigger
              value="transcript"
              className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2"
            >
              Transcript
            </TabsTrigger>
            <TabsTrigger
              value="workflows"
              className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2"
            >
              Workflows
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="overview" className="m-0 p-6">
            <MeetingOverviewTab meeting={meeting} />
          </TabsContent>
          <TabsContent value="participants" className="m-0">
            <MeetingParticipantsTab meeting={meeting} />
          </TabsContent>
          <TabsContent value="transcript" className="m-0">
            <MeetingTranscriptTab meeting={meeting} />
          </TabsContent>
          <TabsContent value="workflows" className="m-0 p-6">
            <MeetingWorkflowsTab meeting={meeting} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
