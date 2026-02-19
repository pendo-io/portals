import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Target,
  Download,
} from "lucide-react";
import { useClariAccountSummary, useClariForecastExport } from "@/hooks/useClari";

interface AccountClariTabProps {
  sfdcOppIds: string[];
  accountId: string;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground">-</span>;
  const variant = score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive";
  return <Badge variant={variant}>{score}</Badge>;
}

export function AccountClariTab({ sfdcOppIds, accountId }: AccountClariTabProps) {
  const { summary, opportunities, isLoading, error } = useClariAccountSummary(sfdcOppIds, accountId);
  const { startExport, exportData, isExporting, exportError } = useClariForecastExport();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 mx-auto opacity-50" />
          <p>Failed to load Clari data</p>
          <p className="text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </div>
    );
  }

  if (sfdcOppIds.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="text-center space-y-2">
          <BarChart3 className="h-8 w-8 mx-auto opacity-50" />
          <p>No opportunities linked to this account</p>
          <p className="text-sm">Clari data requires SFDC opportunities</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Avg Clari Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.avgClariScore != null ? summary.avgClariScore : "-"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${summary.totalForecastAmount.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.opportunityCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Reasons
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.topRisks.length > 0 ? (
                <div className="space-y-1">
                  {summary.topRisks.slice(0, 3).map((risk) => (
                    <Badge key={risk} variant="outline" className="mr-1 text-xs">
                      {risk}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">None detected</span>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Opportunities Table */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Clari Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>CRM Amount</TableHead>
                  <TableHead>Forecast ARR</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opp) => (
                  <TableRow key={opp.oppId}>
                    <TableCell className="font-medium max-w-[200px] truncate">{opp.oppName}</TableCell>
                    <TableCell className="text-muted-foreground">{opp.type || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{opp.stageName || "-"}</TableCell>
                    <TableCell>
                      <ScoreBadge score={opp.clariScore} />
                    </TableCell>
                    <TableCell>
                      {opp.crmAmount != null ? `$${opp.crmAmount.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      {opp.forecastAmount != null ? `$${opp.forecastAmount.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {opp.forecastCategory || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {opp.closeDate ? new Date(opp.closeDate).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {opp.riskReason ? (
                        <Badge variant="outline" className="text-xs">
                          {opp.riskReason}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Forecast Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Download className="h-4 w-4" />
            Forecast Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => startExport()}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              "Load Forecast"
            )}
          </Button>
          {exportError && (
            <p className="text-sm text-destructive mt-2">
              {exportError instanceof Error ? exportError.message : "Export failed"}
            </p>
          )}
          {exportData && exportData.entries.length > 0 && (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Time Period</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Adjusted</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportData.entries.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell>{entry.timePeriod}</TableCell>
                    <TableCell>{entry.forecastCategory}</TableCell>
                    <TableCell>${entry.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {entry.adjustedAmount != null
                        ? `$${entry.adjustedAmount.toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.ownerName || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
