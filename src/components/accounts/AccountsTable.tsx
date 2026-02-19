import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ArrowUpDown, Briefcase, Lightbulb, Map, Loader2, CheckCircle } from "lucide-react";
import salesforceLogo from "@/assets/logos/salesforce.png";
import { AccountLogo } from "@/components/accounts/AccountLogo";
import { workflows as allWorkflows } from "@/data/workflows";
import { toast } from "sonner";
import type { SFDCAccount } from "@/types/salesforce";

export type AccountSortKey = "name" | "type" | "industry" | "location" | "revenue" | "employees" | "owner";
export type SortDir = "asc" | "desc";

interface AccountsTableProps {
  accounts: SFDCAccount[];
  showOwner?: boolean;
  sortKey?: AccountSortKey;
  sortDir?: SortDir;
  onSort?: (key: AccountSortKey) => void;
}

function formatRevenue(revenue: number | null): string {
  if (!revenue) return "-";
  if (revenue >= 1_000_000_000) return `$${(revenue / 1_000_000_000).toFixed(1)}B`;
  if (revenue >= 1_000_000) return `$${(revenue / 1_000_000).toFixed(1)}M`;
  if (revenue >= 1_000) return `$${(revenue / 1_000).toFixed(0)}K`;
  return `$${revenue}`;
}

function formatEmployees(count: number | null): string {
  if (!count) return "-";
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

const STATUS_COLORS: Record<string, string> = {
  "Customer - Direct": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Customer - Channel": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Prospect": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Partner": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Other": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

function getStatusColor(type: string | null): string {
  if (!type) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  return STATUS_COLORS[type] || "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
}

const ROW_WORKFLOWS = [
  { id: "account-research", label: "Account Research", icon: Briefcase },
  { id: "value-hypothesis", label: "Value Hypothesis", icon: Lightbulb },
  { id: "strategy-map", label: "Strategy Map", icon: Map },
] as const;

function getDevUserInfo() {
  const stored = localStorage.getItem("sfdc_dev_session");
  if (!stored) return { email: "", name: "" };
  try {
    const session = JSON.parse(stored);
    return { email: session.email || "", name: session.name || "" };
  } catch {
    return { email: "", name: "" };
  }
}

function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
}

export function AccountsTable({ accounts, showOwner = true, sortKey, sortDir, onSort }: AccountsTableProps) {
  const navigate = useNavigate();
  const [triggeringKey, setTriggeringKey] = useState<string | null>(null);
  const [triggeredKeys, setTriggeredKeys] = useState<Set<string>>(new Set());

  const handleTriggerWorkflow = async (account: SFDCAccount, workflowId: string, label: string) => {
    const workflow = allWorkflows.find((w) => w.id === workflowId);
    if (!workflow?.webhook) return;

    const key = `${account.Id}-${workflowId}`;
    setTriggeringKey(key);
    const userInfo = getDevUserInfo();

    const payload: Record<string, string> = {
      "Client Name": account.Name || "",
      "Client Website": account.Website || "",
      "Your email ": userInfo.email,
      "Your Name": userInfo.name,
    };

    try {
      const webhookUrl = new URL(workflow.webhook);
      Object.entries(payload).forEach(([k, value]) => {
        webhookUrl.searchParams.set(k, value);
      });

      const res = await fetch(webhookUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Workflow returned ${res.status}`);

      let message = `${label} triggered for ${account.Name}`;
      try {
        const text = await res.text();
        const data = JSON.parse(text);
        if (data.message) message = data.message;
      } catch {
        // response may not be JSON — keep default
      }

      setTriggeredKeys((prev) => new Set(prev).add(key));
      toast.success(message, { position: "top-center" });
    } catch (err) {
      console.error("Workflow trigger failed:", err);
      toast.error(`Failed to trigger ${label}`, { position: "top-center" });
    } finally {
      setTriggeringKey(null);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No accounts found
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border-b">
      <Table className="[&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className={`font-semibold text-xs uppercase tracking-wider ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("name")}>
              <span className="inline-flex items-center">Account{onSort && <SortIcon active={sortKey === "name"} dir={sortDir} />}</span>
            </TableHead>
            <TableHead className={`font-semibold text-xs uppercase tracking-wider ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("type")}>
              <span className="inline-flex items-center">Type{onSort && <SortIcon active={sortKey === "type"} dir={sortDir} />}</span>
            </TableHead>
            <TableHead className={`font-semibold text-xs uppercase tracking-wider hidden md:table-cell ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("industry")}>
              <span className="inline-flex items-center">Industry{onSort && <SortIcon active={sortKey === "industry"} dir={sortDir} />}</span>
            </TableHead>
            <TableHead className={`font-semibold text-xs uppercase tracking-wider hidden lg:table-cell ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("location")}>
              <span className="inline-flex items-center">Location{onSort && <SortIcon active={sortKey === "location"} dir={sortDir} />}</span>
            </TableHead>
            <TableHead className={`font-semibold text-xs uppercase tracking-wider text-right hidden sm:table-cell ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("revenue")}>
              <span className="inline-flex items-center justify-end">Revenue{onSort && <SortIcon active={sortKey === "revenue"} dir={sortDir} />}</span>
            </TableHead>
            <TableHead className={`font-semibold text-xs uppercase tracking-wider text-right hidden lg:table-cell ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("employees")}>
              <span className="inline-flex items-center justify-end">Employees{onSort && <SortIcon active={sortKey === "employees"} dir={sortDir} />}</span>
            </TableHead>
            {showOwner && (
              <TableHead className={`font-semibold text-xs uppercase tracking-wider hidden md:table-cell ${onSort ? "cursor-pointer select-none" : ""}`} onClick={() => onSort?.("owner")}>
                <span className="inline-flex items-center">Owner{onSort && <SortIcon active={sortKey === "owner"} dir={sortDir} />}</span>
              </TableHead>
            )}
            <TableHead className="font-semibold text-xs uppercase tracking-wider w-[140px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const location = [account.BillingCity, account.BillingState]
              .filter(Boolean)
              .join(", ");

            return (
              <TableRow
                key={account.Id}
                className="cursor-pointer hover:bg-muted/50 h-[52px]"
                onClick={() => navigate(`/accounts/${account.Id}`)}
              >
                <TableCell className="py-2">
                  <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
                    <AccountLogo domain={account.Domain_Name__c} name={account.Name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{account.Name}</p>
                      {account.Website && (
                        <p className="text-xs text-muted-foreground truncate">{account.Website.replace(/^https?:\/\/(www\.)?/, "")}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  {account.Type ? (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(account.Type)}`}>
                      {account.Type}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
<TableCell className="py-2 hidden md:table-cell">
                  <span className="text-sm">{account.Industry || "-"}</span>
                </TableCell>
                <TableCell className="py-2 hidden lg:table-cell">
                  <span className="text-sm">{location || "-"}</span>
                </TableCell>
                <TableCell className="py-2 text-right hidden sm:table-cell">
                  <span className="text-sm font-medium tabular-nums">{formatRevenue(account.AnnualRevenue)}</span>
                </TableCell>
                <TableCell className="py-2 text-right hidden lg:table-cell">
                  <span className="text-sm tabular-nums">{formatEmployees(account.NumberOfEmployees)}</span>
                </TableCell>
                {showOwner && (
                  <TableCell className="py-2 hidden md:table-cell">
                    <span className="text-sm truncate block max-w-[120px]">{account.Owner?.Name || "-"}</span>
                  </TableCell>
                )}
                <TableCell className="py-2">
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {ROW_WORKFLOWS.map((rw) => {
                      const key = `${account.Id}-${rw.id}`;
                      const isTriggering = triggeringKey === key;
                      const isTriggered = triggeredKeys.has(key);
                      const Icon = rw.icon;
                      return (
                        <Button
                          key={rw.id}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={rw.label}
                          disabled={isTriggering || isTriggered}
                          onClick={() => handleTriggerWorkflow(account, rw.id, rw.label)}
                        >
                          {isTriggering ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isTriggered ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Icon className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      );
                    })}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="View in Salesforce"
                      asChild
                    >
                      <a
                        href={`https://pendo--full.sandbox.lightning.force.com/${account.Id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img src={salesforceLogo} alt="Salesforce" className="h-4 w-4 object-contain" />
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
