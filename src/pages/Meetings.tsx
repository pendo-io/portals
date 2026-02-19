import { MeetingAnalysisContent } from "@/components/meeting-analysis/MeetingAnalysisContent";
import { Video } from "lucide-react";

export default function Meetings() {
  const hasEmail = (() => {
    try {
      const stored = localStorage.getItem("sfdc_dev_session");
      if (!stored) return false;
      return !!JSON.parse(stored).email;
    } catch {
      return false;
    }
  })();

  if (!hasEmail) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-section-title">Connect Salesforce</h2>
          <p className="text-muted-foreground">
            Sign in with your Salesforce account to view your meetings.
            Meetings are fetched from Momentum using your SFDC email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MeetingAnalysisContent />
    </div>
  );
}
