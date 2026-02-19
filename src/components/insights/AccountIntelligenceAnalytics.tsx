import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Brain, Sparkles, DollarSign, Clock, Search, 
  TrendingUp, FileText, Zap, Info
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";

interface UsageRecord {
  id: string;
  report_id: string | null;
  user_id: string;
  client_name: string;
  report_type: string;
  openai_calls: number;
  openai_input_tokens: number;
  openai_output_tokens: number;
  openai_cost_usd: number;
  gemini_calls: number;
  gemini_input_tokens: number;
  gemini_output_tokens: number;
  gemini_cost_usd: number;
  google_search_calls: number;
  google_search_results: number;
  google_search_cost_usd: number;
  serper_calls: number;
  serper_results: number;
  serper_cost_usd: number;
  embedding_calls: number;
  embedding_tokens: number;
  embedding_cost_usd: number;
  total_cost_usd: number;
  generation_time_seconds: number | null;
  created_at: string;
}

interface AccountIntelligenceAnalyticsProps {
  usageData: UsageRecord[];
  timeRangeDays: number;
}

const COLORS = [
  'hsl(345, 100%, 64%)', // Primary pink
  'hsl(200, 80%, 60%)',  // Blue
  'hsl(150, 60%, 50%)',  // Green
  'hsl(55, 98%, 55%)',   // Yellow
  'hsl(280, 70%, 60%)',  // Purple
];

export function AccountIntelligenceAnalytics({ usageData, timeRangeDays }: AccountIntelligenceAnalyticsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const periodStart = new Date(now.getTime() - timeRangeDays * 24 * 60 * 60 * 1000);
    
    // Filter data within time range
    const dataInPeriod = usageData.filter(u => new Date(u.created_at) >= periodStart);
    
    // Total reports
    const totalReports = dataInPeriod.length;
    
    // Total cost
    const totalCost = dataInPeriod.reduce((sum, u) => sum + Number(u.total_cost_usd || 0), 0);
    
    // Average generation time
    const validTimes = dataInPeriod.filter(u => u.generation_time_seconds != null);
    const avgGenTime = validTimes.length > 0 
      ? validTimes.reduce((sum, u) => sum + (u.generation_time_seconds || 0), 0) / validTimes.length 
      : 0;
    
    // Token totals
    const openaiInputTokens = dataInPeriod.reduce((sum, u) => sum + u.openai_input_tokens, 0);
    const openaiOutputTokens = dataInPeriod.reduce((sum, u) => sum + u.openai_output_tokens, 0);
    const geminiInputTokens = dataInPeriod.reduce((sum, u) => sum + u.gemini_input_tokens, 0);
    const geminiOutputTokens = dataInPeriod.reduce((sum, u) => sum + u.gemini_output_tokens, 0);
    const embeddingTokens = dataInPeriod.reduce((sum, u) => sum + u.embedding_tokens, 0);
    
    // API call totals
    const openaiCalls = dataInPeriod.reduce((sum, u) => sum + u.openai_calls, 0);
    const geminiCalls = dataInPeriod.reduce((sum, u) => sum + u.gemini_calls, 0);
    const searchCalls = dataInPeriod.reduce((sum, u) => sum + u.google_search_calls + u.serper_calls, 0);
    const embeddingCalls = dataInPeriod.reduce((sum, u) => sum + u.embedding_calls, 0);
    
    // Cost breakdown
    const openaiCost = dataInPeriod.reduce((sum, u) => sum + Number(u.openai_cost_usd || 0), 0);
    const geminiCost = dataInPeriod.reduce((sum, u) => sum + Number(u.gemini_cost_usd || 0), 0);
    const searchCost = dataInPeriod.reduce((sum, u) => sum + Number(u.google_search_cost_usd || 0) + Number(u.serper_cost_usd || 0), 0);
    const embeddingCost = dataInPeriod.reduce((sum, u) => sum + Number(u.embedding_cost_usd || 0), 0);
    
    // Cost breakdown for pie chart
    const costBreakdown = [
      { name: 'OpenAI', value: openaiCost, color: COLORS[0] },
      { name: 'Gemini', value: geminiCost, color: COLORS[1] },
      { name: 'Search APIs', value: searchCost, color: COLORS[2] },
      { name: 'Embeddings', value: embeddingCost, color: COLORS[3] },
    ].filter(c => c.value > 0);
    
    // Reports by type
    const reportsByType: Record<string, number> = {};
    dataInPeriod.forEach(u => {
      const type = u.report_type || 'unknown';
      reportsByType[type] = (reportsByType[type] || 0) + 1;
    });
    
    const reportTypeData = Object.entries(reportsByType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
      }));
    
    // Reports by client (top 5)
    const reportsByClient: Record<string, number> = {};
    dataInPeriod.forEach(u => {
      reportsByClient[u.client_name] = (reportsByClient[u.client_name] || 0) + 1;
    });
    
    const topClients = Object.entries(reportsByClient)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Daily usage trend
    const dailyUsage: Record<string, { reports: number; cost: number }> = {};
    for (let i = Math.min(timeRangeDays, 14) - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      dailyUsage[key] = { reports: 0, cost: 0 };
    }
    
    dataInPeriod.forEach(u => {
      const date = new Date(u.created_at).toISOString().split('T')[0];
      if (dailyUsage[date]) {
        dailyUsage[date].reports++;
        dailyUsage[date].cost += Number(u.total_cost_usd || 0);
      }
    });
    
    const dailyTrend = Object.entries(dailyUsage).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      reports: data.reports,
      cost: data.cost,
    }));
    
    return {
      totalReports,
      totalCost,
      avgGenTime,
      openaiInputTokens,
      openaiOutputTokens,
      geminiInputTokens,
      geminiOutputTokens,
      embeddingTokens,
      openaiCalls,
      geminiCalls,
      searchCalls,
      embeddingCalls,
      costBreakdown,
      reportTypeData,
      topClients,
      dailyTrend,
    };
  }, [usageData, timeRangeDays]);

  if (usageData.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Account Intelligence Analytics</CardTitle>
              <CardDescription>No usage data available yet</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Generate your first Account Intelligence report to see API usage analytics here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (n: number) => n.toLocaleString();
  const formatCost = (n: number) => `$${n.toFixed(4)}`;
  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-section-title">Account Intelligence Analytics</h2>
          <p className="text-sm text-muted-foreground">API usage, costs, and report generation metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports Generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total API Cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCost(stats.totalCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalReports > 0 ? `~${formatCost(stats.totalCost / stats.totalReports)}/report` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Generation Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Math.round(stats.avgGenTime)}s</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per report
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Total API Calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(stats.openaiCalls + stats.geminiCalls + stats.searchCalls + stats.embeddingCalls)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              LLM + Search + Embeddings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Trend */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Daily Report Generation
            </CardTitle>
            <CardDescription>Reports generated per day with cost overlay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="left" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="reports" 
                    stroke="hsl(345, 100%, 64%)" 
                    fill="hsl(345, 100%, 64%)" 
                    fillOpacity={0.3}
                    name="Reports"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cost" 
                    stroke="hsl(150, 60%, 50%)" 
                    strokeWidth={2}
                    dot={false}
                    name="Cost ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Cost Breakdown by API
            </CardTitle>
            <CardDescription>Distribution of costs across services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center">
              {stats.costBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.costBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {stats.costBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => formatCost(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center w-full">No cost data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage & Report Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Usage Details */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Token Usage by Provider
            </CardTitle>
            <CardDescription>Input and output tokens consumed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* OpenAI */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-[hsl(345,100%,64%)]/10 text-[hsl(345,100%,64%)] border-[hsl(345,100%,64%)]/30">
                    OpenAI
                  </Badge>
                  <span className="text-sm text-muted-foreground">{stats.openaiCalls} calls</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatTokens(stats.openaiInputTokens + stats.openaiOutputTokens)} tokens</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTokens(stats.openaiInputTokens)} in / {formatTokens(stats.openaiOutputTokens)} out
                  </div>
                </div>
              </div>

              {/* Gemini */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-[hsl(200,80%,60%)]/10 text-[hsl(200,80%,60%)] border-[hsl(200,80%,60%)]/30">
                    Gemini
                  </Badge>
                  <span className="text-sm text-muted-foreground">{stats.geminiCalls} calls</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatTokens(stats.geminiInputTokens + stats.geminiOutputTokens)} tokens</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTokens(stats.geminiInputTokens)} in / {formatTokens(stats.geminiOutputTokens)} out
                  </div>
                </div>
              </div>

              {/* Search APIs */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-[hsl(150,60%,50%)]/10 text-[hsl(150,60%,50%)] border-[hsl(150,60%,50%)]/30">
                    Search
                  </Badge>
                  <span className="text-sm text-muted-foreground">{stats.searchCalls} queries</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">Google + Serper</div>
                  <div className="text-xs text-muted-foreground">Web & news results</div>
                </div>
              </div>

              {/* Embeddings */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-[hsl(280,70%,60%)]/10 text-[hsl(280,70%,60%)] border-[hsl(280,70%,60%)]/30">
                    Embeddings
                  </Badge>
                  <span className="text-sm text-muted-foreground">{stats.embeddingCalls} calls</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatTokens(stats.embeddingTokens)} tokens</div>
                  <div className="text-xs text-muted-foreground">RAG document search</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Types */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Report Types
            </CardTitle>
            <CardDescription>Distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.reportTypeData.map((type, i) => (
                <div key={type.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm">{type.name}</span>
                  </div>
                  <Badge variant="secondary">{type.count}</Badge>
                </div>
              ))}
              {stats.reportTypeData.length === 0 && (
                <p className="text-sm text-muted-foreground">No reports yet</p>
              )}
            </div>

            {stats.topClients.length > 0 && (
              <>
                <hr className="my-4 border-border/50" />
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Top Researched Accounts
                  </h4>
                  <div className="space-y-2">
                    {stats.topClients.map((client, i) => (
                      <div key={client.name} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[140px]">{client.name}</span>
                        <Badge variant="outline">{client.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
