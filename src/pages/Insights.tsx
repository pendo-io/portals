import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Users, TrendingUp, TrendingDown, Activity, BarChart3, 
  Zap, AlertTriangle, Calendar, Loader2, UserPlus, ArrowUpRight, ArrowDownRight, 
  MessageCircle, RefreshCw, Download, Info, FileSpreadsheet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { toast } from "sonner";
import { AccountIntelligenceAnalytics } from "@/components/insights/AccountIntelligenceAnalytics";

interface DailyLogin {
  date: string;
  count: number;
}

interface TopUser {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  run_count: number;
}

interface TopWorkflow {
  workflow_id: string;
  workflow_name: string;
  run_count: number;
}

interface CategoryStats {
  category: string;
  count: number;
}

interface TopAskWillUser {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  message_count: number;
}

type TimeRange = '7d' | '14d' | '28d' | '90d';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; days: number }[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '14d', label: 'Last 14 days', days: 14 },
  { value: '28d', label: 'Last 28 days', days: 28 },
  { value: '90d', label: 'Last 90 days', days: 90 },
];

const COLORS = ['hsl(345, 100%, 64%)', 'hsl(55, 98%, 76%)', 'hsl(200, 80%, 60%)', 'hsl(150, 60%, 50%)', 'hsl(280, 70%, 60%)', 'hsl(30, 90%, 60%)'];

// Mini sparkline component
const Sparkline = ({ data, color = "hsl(345, 100%, 64%)" }: { data: number[]; color?: string }) => {
  const sparkData = data.map((value, index) => ({ value, index }));
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparkData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={1.5} 
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Skeleton card component for loading state
const MetricCardSkeleton = () => (
  <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-muted/50 to-muted/30">
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-4 w-32" />
    </CardContent>
  </Card>
);

const ChartSkeleton = () => (
  <Card className="border-0 shadow-lg">
    <CardHeader>
      <Skeleton className="h-6 w-40 mb-2" />
      <Skeleton className="h-4 w-56" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[300px] w-full" />
    </CardContent>
  </Card>
);

const Insights = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('28d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Raw data
  const [profiles, setProfiles] = useState<any[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [askWillMessages, setAskWillMessages] = useState<any[]>([]);
  const [aiUsageData, setAiUsageData] = useState<any[]>([]);

  // Get days for current time range
  const currentDays = TIME_RANGE_OPTIONS.find(t => t.value === timeRange)?.days || 28;

  useEffect(() => {
    checkIfSuperAdmin();
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllStats();
    }
  }, [isSuperAdmin]);

  const checkIfSuperAdmin = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();
    
    if (!data) {
      navigate('/');
      return;
    }
    
    setIsSuperAdmin(true);
  };

  const fetchAllStats = async () => {
    try {
      setRefreshing(true);

      // Fetch all data in parallel
      const [
        profilesRes,
        workflowRunsRes,
        workflowsRes,
        askWillRes,
        aiUsageRes
      ] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, avatar_url, created_at, last_login'),
        supabase.from('workflow_runs').select('*'),
        supabase.from('workflows').select('id, category, title'),
        supabase.from('ask_will_messages').select('*'),
        supabase.from('account_intelligence_usage').select('*').order('created_at', { ascending: false })
      ]);

      setProfiles(profilesRes.data || []);
      setWorkflowRuns(workflowRunsRes.data || []);
      setWorkflows(workflowsRes.data || []);
      setAskWillMessages(askWillRes.data || []);
      setAiUsageData(aiUsageRes.data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error("Failed to fetch analytics data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAllStats();
    toast.success("Refreshing data...");
  };

  // Computed stats based on time range
  const stats = useMemo(() => {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - currentDays * 24 * 60 * 60 * 1000).toISOString();
    const halfPeriodAgo = new Date(now.getTime() - (currentDays / 2) * 24 * 60 * 60 * 1000).toISOString();

    // Total users
    const totalUsers = profiles.length;

    // New users in period
    const newUsersInPeriod = profiles.filter(p => new Date(p.created_at) >= new Date(daysAgo)).length;

    // Daily logins for chart
    const loginsByDay: Record<string, number> = {};
    for (let i = currentDays - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      loginsByDay[key] = 0;
    }
    
    profiles.forEach(p => {
      if (p.last_login) {
        const loginDate = new Date(p.last_login).toISOString().split('T')[0];
        if (loginsByDay[loginDate] !== undefined) {
          loginsByDay[loginDate]++;
        }
      }
    });

    const dailyLogins = Object.entries(loginsByDay).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count
    }));

    // Sparkline data for users (last 7 days of new signups)
    const userSparkline: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const count = profiles.filter(p => {
        const created = new Date(p.created_at);
        return created >= dayStart && created < dayEnd;
      }).length;
      userSparkline.push(count);
    }

    // Active users
    const activeUsersInPeriod = profiles.filter(p => p.last_login && new Date(p.last_login) >= new Date(daysAgo)).length;

    // Workflow runs
    const runsInPeriod = workflowRuns.filter(r => new Date(r.created_at) >= new Date(daysAgo));
    const totalRunsInPeriod = runsInPeriod.length;
    const failuresInPeriod = runsInPeriod.filter(r => r.status === 'failure').length;

    // Runs in first half vs second half of period for trend
    const runsFirstHalf = workflowRuns.filter(r => {
      const created = new Date(r.created_at);
      return created >= new Date(daysAgo) && created < new Date(halfPeriodAgo);
    }).length;
    const runsSecondHalf = workflowRuns.filter(r => new Date(r.created_at) >= new Date(halfPeriodAgo)).length;

    // Sparkline for workflow runs
    const runSparkline: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const count = workflowRuns.filter(r => {
        const created = new Date(r.created_at);
        return created >= dayStart && created < dayEnd;
      }).length;
      runSparkline.push(count);
    }

    // Top users by workflow runs
    const userRunCounts: Record<string, number> = {};
    runsInPeriod.forEach(run => {
      userRunCounts[run.user_id] = (userRunCounts[run.user_id] || 0) + 1;
    });

    const topUsers = Object.entries(userRunCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => {
        const profile = profiles.find(p => p.id === userId);
        return {
          id: userId,
          email: profile?.email || null,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          run_count: count
        };
      });

    // Top workflows
    const workflowRunCounts: Record<string, { id: string; count: number }> = {};
    runsInPeriod.forEach(run => {
      const name = run.workflow_name;
      if (!workflowRunCounts[name]) {
        workflowRunCounts[name] = { id: run.workflow_id, count: 0 };
      }
      workflowRunCounts[name].count++;
    });

    const topWorkflows = Object.entries(workflowRunCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, data]) => ({
        workflow_id: data.id,
        workflow_name: name,
        run_count: data.count
      }));

    // Category stats
    const categoryCounts: Record<string, number> = {};
    runsInPeriod.forEach(run => {
      const workflow = workflows.find(w => w.id === run.workflow_id || w.title === run.workflow_name);
      const category = workflow?.category || 'Unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const categoryStats = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    // Ask Will stats
    const askWillInPeriod = askWillMessages.filter(m => new Date(m.created_at) >= new Date(daysAgo));
    const totalAskWillInPeriod = askWillInPeriod.length;

    // Top Ask Will users
    const askWillUserCounts: Record<string, number> = {};
    askWillInPeriod.forEach(msg => {
      askWillUserCounts[msg.user_id] = (askWillUserCounts[msg.user_id] || 0) + 1;
    });

    const topAskWillUsers = Object.entries(askWillUserCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => {
        const profile = profiles.find(p => p.id === userId);
        return {
          id: userId,
          email: profile?.email || null,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          message_count: count
        };
      });

    // Growth calculations
    const avgDailyFirst = currentDays > 0 ? runsFirstHalf / (currentDays / 2) : 0;
    const avgDailySecond = currentDays > 0 ? runsSecondHalf / (currentDays / 2) : 0;
    const growthRate = avgDailyFirst > 0 ? Math.round(((avgDailySecond - avgDailyFirst) / avgDailyFirst) * 100) : 
                       avgDailySecond > 0 ? 100 : 0;

    return {
      totalUsers,
      newUsersInPeriod,
      activeUsersInPeriod,
      totalRunsInPeriod,
      failuresInPeriod,
      growthRate,
      dailyLogins,
      topUsers,
      topWorkflows,
      categoryStats,
      totalAskWillInPeriod,
      topAskWillUsers,
      userSparkline,
      runSparkline,
      runsFirstHalf,
      runsSecondHalf,
      totalRuns: workflowRuns.length,
      totalAskWill: askWillMessages.length
    };
  }, [profiles, workflowRuns, workflows, askWillMessages, currentDays]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Metric', 'Value'];
    const data = [
      ['Time Range', TIME_RANGE_OPTIONS.find(t => t.value === timeRange)?.label || ''],
      ['Export Date', new Date().toISOString()],
      [''],
      ['Key Metrics'],
      ['Total Users', stats.totalUsers],
      ['New Users (Period)', stats.newUsersInPeriod],
      ['Active Users (Period)', stats.activeUsersInPeriod],
      ['Total Workflow Runs', stats.totalRunsInPeriod],
      ['Failures', stats.failuresInPeriod],
      ['Failure Rate', `${stats.totalRunsInPeriod > 0 ? ((stats.failuresInPeriod / stats.totalRunsInPeriod) * 100).toFixed(1) : 0}%`],
      ['Growth Rate', `${stats.growthRate}%`],
      ['Ask Will Messages', stats.totalAskWillInPeriod],
      [''],
      ['Top Workflows'],
      ...stats.topWorkflows.map(w => [w.workflow_name, w.run_count]),
      [''],
      ['Top Users'],
      ...stats.topUsers.map(u => [u.full_name || u.email || 'Unknown', u.run_count]),
      [''],
      ['Category Distribution'],
      ...stats.categoryStats.map(c => [c.category, c.count]),
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Report exported successfully");
  };

  if (loading) {
    return (
      <div className="flex-1 bg-background">
        <main className="container mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Metric Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <MetricCardSkeleton key={i} />)}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Page Header with Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Platform performance and user engagement metrics
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  • Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
            
            <Button variant="outline" onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-10 -mt-10" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>Total registered users on the platform</TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{stats.totalUsers}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="text-green-500 font-medium">+{stats.newUsersInPeriod}</span> in period
                  </p>
                </div>
                <Sparkline data={stats.userSparkline} color="hsl(345, 100%, 64%)" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500/10 to-green-500/5">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Active Users
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>Users who logged in during this period</TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeUsersInPeriod}</div>
              <div className="flex items-center gap-1 text-sm mt-1">
                <span className="text-muted-foreground">
                  {stats.totalUsers > 0 ? ((stats.activeUsersInPeriod / stats.totalUsers) * 100).toFixed(0) : 0}% engagement
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Workflow Runs
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>Total workflow executions in this period</TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{stats.totalRunsInPeriod}</div>
                  <div className="flex items-center gap-1 text-sm mt-1">
                    {stats.growthRate >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className={stats.growthRate >= 0 ? "text-green-500" : "text-red-500"}>
                      {stats.growthRate}%
                    </span>
                    <span className="text-muted-foreground">trend</span>
                  </div>
                </div>
                <Sparkline data={stats.runSparkline} color="hsl(200, 80%, 60%)" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-500/10 to-red-500/5">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -mr-10 -mt-10" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Failures
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>Failed workflow runs that may need attention</TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.failuresInPeriod}</div>
              <p className="text-sm text-muted-foreground mt-1">
                <span className={stats.failuresInPeriod > 0 ? "text-red-500" : "text-green-500"}>
                  {stats.totalRunsInPeriod > 0 ? ((stats.failuresInPeriod / stats.totalRunsInPeriod) * 100).toFixed(1) : 0}%
                </span> failure rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Logins Chart */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Daily Active Users
              </CardTitle>
              <CardDescription>Users who logged in each day ({currentDays} days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyLogins}>
                    <defs>
                      <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(345, 100%, 64%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(345, 100%, 64%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(345, 100%, 64%)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorLogins)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Workflow Categories
              </CardTitle>
              <CardDescription>Distribution of runs by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="category"
                      label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {stats.categoryStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benchmark Card */}
        <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-card to-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Period Comparison
            </CardTitle>
            <CardDescription>First half vs second half of selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">First Half</p>
                <p className="text-3xl font-bold">{stats.runsFirstHalf}</p>
                <p className="text-sm text-muted-foreground">workflow runs</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">Second Half</p>
                <p className="text-3xl font-bold">{stats.runsSecondHalf}</p>
                <p className="text-sm text-muted-foreground">workflow runs</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <p className="text-sm text-muted-foreground mb-1">Growth Rate</p>
                <div className="flex items-center justify-center gap-2">
                  {stats.growthRate >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  )}
                  <p className={`text-3xl font-bold ${stats.growthRate >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {stats.growthRate}%
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">period over period</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ask Will Stats */}
        <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-violet-500/10 to-violet-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-violet-500" />
              Ask Will Usage
            </CardTitle>
            <CardDescription>AI assistant conversation analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">Total Messages</p>
                <p className="text-3xl font-bold">{stats.totalAskWill}</p>
                <p className="text-sm text-muted-foreground">all time</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">In Period</p>
                <p className="text-3xl font-bold">{stats.totalAskWillInPeriod}</p>
                <p className="text-sm text-muted-foreground">messages</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-violet-500/10">
                <p className="text-sm text-muted-foreground mb-1">Daily Average</p>
                <p className="text-3xl font-bold">
                  {(stats.totalAskWillInPeriod / currentDays).toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">messages/day</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Users */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Top 10 Users
              </CardTitle>
              <CardDescription>Most active users by workflow runs in period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data available for this period</p>
                ) : (
                  stats.topUsers.map((user, index) => (
                    <div 
                      key={user.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {user.full_name?.[0] || user.email?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user.full_name || user.email || 'Unknown'}
                        </p>
                        {user.full_name && user.email && (
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {user.run_count} runs
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Workflows */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Top 10 Workflows
              </CardTitle>
              <CardDescription>Most used workflows in period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topWorkflows.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data available for this period</p>
                ) : (
                  stats.topWorkflows.map((workflow, index) => (
                    <div 
                      key={workflow.workflow_id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{workflow.workflow_name}</p>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {workflow.run_count} runs
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Intelligence Analytics */}
        <div className="mt-8">
          <AccountIntelligenceAnalytics usageData={aiUsageData} timeRangeDays={currentDays} />
        </div>

        {/* Top Ask Will Users */}
        <Card className="mt-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-violet-500" />
              Top 10 Ask Will Users
            </CardTitle>
            <CardDescription>Most active users in Ask Will conversations in period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {stats.topAskWillUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 col-span-full">No Ask Will usage data for this period</p>
              ) : (
                stats.topAskWillUsers.map((user, index) => (
                  <div 
                    key={user.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/30 text-violet-600 dark:text-violet-400 text-sm font-bold">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="bg-violet-500/20 text-violet-600 dark:text-violet-400 text-xs">
                        {user.full_name?.[0] || user.email?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {user.full_name || user.email?.split('@')[0] || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.message_count} msgs</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Insights;
