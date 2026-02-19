import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Target, AlertTriangle, CheckCircle } from "lucide-react";
import type { MomentumMeeting } from "@/types/meeting";

interface MeetingOverviewTabProps {
  meeting: MomentumMeeting;
}

export function MeetingOverviewTab({ meeting }: MeetingOverviewTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Summary */}
      {meeting.summary && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Meeting Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {meeting.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Topics */}
      {meeting.keyTopics && meeting.keyTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Key Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {meeting.keyTopics.map((topic, i) => (
                <Badge key={i} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decisions */}
      {meeting.decisions && meeting.decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Key Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {meeting.decisions.map((decision, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary mt-0.5 shrink-0">-</span>
                  <span className="text-muted-foreground">{decision}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Risks */}
      {meeting.risks && meeting.risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {meeting.risks.map((risk, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-destructive mt-0.5 shrink-0">-</span>
                  <span className="text-muted-foreground">{risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {meeting.actionItems && meeting.actionItems.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {meeting.actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-primary mt-0.5 shrink-0">{i + 1}.</span>
                  <div>
                    <p>{item.text}</p>
                    <div className="flex gap-2 mt-1">
                      {item.assignee && (
                        <Badge variant="outline" className="text-xs">
                          {item.assignee}
                        </Badge>
                      )}
                      {item.priority && (
                        <Badge
                          variant={
                            item.priority.toLowerCase() === "high"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* No data fallback */}
      {!meeting.summary &&
        (!meeting.keyTopics || meeting.keyTopics.length === 0) &&
        (!meeting.decisions || meeting.decisions.length === 0) &&
        (!meeting.actionItems || meeting.actionItems.length === 0) && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-12 text-muted-foreground">
            No summary data available for this meeting yet.
          </div>
        )}
    </div>
  );
}
