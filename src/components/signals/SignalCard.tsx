import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountLogo } from "@/components/accounts/AccountLogo";
import { ExternalLink, Flame, UserCheck, Globe, Target, TrendingUp, UserPlus, Newspaper, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Signal } from "@/data/mockSignals";

const SIGNAL_CONFIG: Record<string, { icon: typeof Flame; color: string; label: string }> = {
  "6sense New Hot Account": { icon: Flame, color: "text-red-500 bg-red-500/10", label: "Hot Account" },
  "Sixth Sense Contact Engagement": { icon: UserCheck, color: "text-blue-500 bg-blue-500/10", label: "Contact Engagement" },
  "Sixth Sense Recent Web Visits": { icon: Globe, color: "text-blue-500 bg-blue-500/10", label: "Web Visits" },
  "Sixth Sense Recent Intent Activities": { icon: Target, color: "text-purple-500 bg-purple-500/10", label: "Intent Activity" },
  "Job Postings - Growth Flag": { icon: TrendingUp, color: "text-green-500 bg-green-500/10", label: "Growth Flag" },
  "Hiring": { icon: UserPlus, color: "text-teal-500 bg-teal-500/10", label: "Senior Hire" },
  "News": { icon: Newspaper, color: "text-yellow-500 bg-yellow-500/10", label: "News" },
  "Fundraising": { icon: Newspaper, color: "text-yellow-500 bg-yellow-500/10", label: "Fundraising" },
  "Product Release": { icon: Newspaper, color: "text-yellow-500 bg-yellow-500/10", label: "Product Release" },
  "Qualified Signals Engagement": { icon: Zap, color: "text-purple-500 bg-purple-500/10", label: "Qualified Signal" },
};

function getDescription(signal: Signal): string {
  const meta = signal.metaData;
  switch (signal.signalType) {
    case "6sense New Hot Account":
      return "This account is showing strong buying intent signals.";
    case "Sixth Sense Contact Engagement":
      return meta ? `${meta.personName || "Unknown"} (${meta.title || "Unknown"}) is engaging with ${meta.visited || "your content"}` : signal.title;
    case "Sixth Sense Recent Web Visits":
      return meta?.pages ? `Visited: ${meta.pages.join(", ")}` : "Recent web visit activity detected.";
    case "Sixth Sense Recent Intent Activities":
      return meta?.keywords ? `Intent keywords: ${meta.keywords.join(", ")}` : signal.title;
    case "Job Postings - Growth Flag":
      return `${meta?.pctGrowth || ""}% increase in engineering/product hiring versus average`;
    case "Hiring":
      return meta ? `${meta.full_name || "New hire"} joined as ${signal.title}${meta.job_start_date ? ` (started ${new Date(meta.job_start_date).toLocaleDateString()})` : ""}` : signal.title;
    case "News":
    case "Fundraising":
    case "Product Release":
      return meta?.news_publisher ? `${signal.title} — ${meta.news_publisher}` : signal.title;
    case "Qualified Signals Engagement":
      return meta ? `${meta.qTrend === "Heating" ? "Heating" : "Trending"} — condition: ${meta.qCondition || "Active"}` : signal.title;
    default:
      return signal.title;
  }
}

interface SignalCardProps {
  signal: Signal;
}

export function SignalCard({ signal }: SignalCardProps) {
  const navigate = useNavigate();
  const config = SIGNAL_CONFIG[signal.signalType] || { icon: Zap, color: "text-muted-foreground bg-muted", label: signal.signalType };
  const Icon = config.icon;
  const description = getDescription(signal);

  return (
    <Card className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/30">
      <div className={`shrink-0 rounded-full p-2 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="secondary" className="text-[11px] py-0 px-1.5 shrink-0">
            {config.label}
          </Badge>
          <button
            onClick={() => signal.accountId && navigate(`/accounts/${signal.accountId}`)}
            className="flex items-center gap-1.5 min-w-0"
          >
            <AccountLogo domain={signal.accountDomain} name={signal.accountName} size="sm" />
            <span className="text-sm font-medium hover:underline truncate">{signal.accountName}</span>
          </button>
          {signal.accountType && (
            <span className="text-xs text-muted-foreground shrink-0">{signal.accountType}</span>
          )}
        </div>
        <p className="text-sm font-medium leading-tight">
          {signal.contactName
            ? `${signal.contactName} · ${signal.contactTitle}`
            : `People at ${signal.accountName}`}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-muted-foreground">
            {new Date(signal.publishDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <span className="text-xs text-muted-foreground">via {signal.source}</span>
          {signal.linkedinUrl && (
            <a
              href={signal.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
