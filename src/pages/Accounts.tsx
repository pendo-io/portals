import { AccountsToolbar } from "@/components/accounts/AccountsToolbar";
import { AccountsTable } from "@/components/accounts/AccountsTable";
import type { AccountSortKey, SortDir } from "@/components/accounts/AccountsTable";
import { useAccounts, useSearchAllAccounts } from "@/hooks/useAccounts";
import { useSalesforce } from "@/hooks/useSalesforce";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Building2, ChevronLeft, ChevronRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SFDCAccount } from "@/types/salesforce";

const PAGE_SIZE = 50;

const SEARCH_ALL_KEY = "pendogtm-search-all-accounts";

export default function Accounts() {
  const navigate = useNavigate();
  const { sfdcLoading, sfdcAccessToken } = useSalesforce();
  const [searchAll, setSearchAll] = useState<boolean>(() => {
    return localStorage.getItem(SEARCH_ALL_KEY) === "true";
  });

  const [search, setSearch] = useState("");

  const { data: myAccounts, isLoading: isLoadingMy, error: errorMy } = useAccounts();
  const { data: searchResults, isLoading: isLoadingSearch, error: errorSearch } = useSearchAllAccounts(search, searchAll);

  const accounts = searchAll ? searchResults : myAccounts;
  const isLoading = searchAll ? isLoadingSearch : (isLoadingMy || sfdcLoading || (!myAccounts && !errorMy));
  const error = searchAll ? errorSearch : errorMy;

  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<AccountSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSearchAllChange = (value: boolean) => {
    setSearchAll(value);
    localStorage.setItem(SEARCH_ALL_KEY, String(value));
    window.dispatchEvent(new Event("accounts-toggle"));
    setSearch("");
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleIndustryFilterChange = (value: string) => {
    setIndustryFilter(value);
    setPage(0);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((account: SFDCAccount) => {
      const matchesSearch =
        searchAll || !search ||
        account.Name.toLowerCase().includes(search.toLowerCase()) ||
        account.Industry?.toLowerCase().includes(search.toLowerCase());

      const matchesIndustry =
        industryFilter === "all" || account.Industry === industryFilter;

      const matchesStatus =
        statusFilter === "all" || account.Type === statusFilter;

      return matchesSearch && matchesIndustry && matchesStatus;
    });
  }, [accounts, search, searchAll, industryFilter, statusFilter]);

  const handleSort = (key: AccountSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const sortedAccounts = useMemo(() => {
    if (!sortKey) return filteredAccounts;
    return [...filteredAccounts].sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;
      switch (sortKey) {
        case "name": aVal = a.Name; bVal = b.Name; break;
        case "type": aVal = a.Type; bVal = b.Type; break;
        case "industry": aVal = a.Industry; bVal = b.Industry; break;
        case "location":
          aVal = [a.BillingCity, a.BillingState].filter(Boolean).join(", ");
          bVal = [b.BillingCity, b.BillingState].filter(Boolean).join(", ");
          break;
        case "revenue": aVal = a.AnnualRevenue; bVal = b.AnnualRevenue; break;
        case "employees": aVal = a.NumberOfEmployees; bVal = b.NumberOfEmployees; break;
        case "owner": aVal = a.Owner?.Name || null; bVal = b.Owner?.Name || null; break;
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredAccounts, sortKey, sortDir]);

  const industries = useMemo(() => {
    if (!accounts) return [];
    const set = new Set(accounts.map((a: SFDCAccount) => a.Industry).filter(Boolean));
    return [...set].sort() as string[];
  }, [accounts]);

  const statuses = useMemo(() => {
    if (!accounts) return [];
    const set = new Set(accounts.map((a: SFDCAccount) => a.Type).filter(Boolean));
    return [...set].sort() as string[];
  }, [accounts]);

  const totalPages = Math.max(1, Math.ceil(sortedAccounts.length / PAGE_SIZE));
  const paginatedAccounts = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedAccounts.slice(start, start + PAGE_SIZE);
  }, [sortedAccounts, page]);

  if (!sfdcLoading && !sfdcAccessToken) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-section-title">Connect Salesforce</h2>
          <p className="text-muted-foreground">
            Sign in with your Salesforce account to view your accounts here.
            Your accounts, opportunities, and contacts will be synced automatically.
          </p>
          <Button onClick={() => navigate("/auth")} className="mt-2">
            Sign in with Salesforce
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AccountsToolbar
        search={search}
        onSearchChange={handleSearchChange}
        industryFilter={industryFilter}
        onIndustryFilterChange={handleIndustryFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        industries={industries}
        statuses={statuses}
        totalCount={accounts?.length || 0}
        filteredCount={filteredAccounts.length}
        isSearching={isLoading}
        searchAll={searchAll}
        onSearchAllChange={handleSearchAllChange}
      />
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="flex items-center justify-center p-8">
            {(error as Error).message?.includes("401") || (error as Error).message?.includes("INVALID_SESSION") ? (
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <LogIn className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-section-title">Session Expired</h2>
                <p className="text-muted-foreground">
                  Your Salesforce session has expired. Please sign in again to continue.
                </p>
                <Button onClick={() => navigate("/auth")} className="mt-2">
                  Reconnect Salesforce
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-destructive font-medium">Failed to load accounts</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading accounts...</p>
            </div>
          </div>
        ) : searchAll && search.trim().length < 2 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Search by name or industry to find accounts across Salesforce.</p>
          </div>
        ) : (
          <AccountsTable accounts={paginatedAccounts} showOwner={searchAll} sortKey={sortKey ?? undefined} sortDir={sortDir} onSort={handleSort} />
        )}
      </div>
      {totalPages > 1 && (
        <div className="border-t border-border/50 px-3 sm:px-6 py-3 flex items-center justify-between bg-card/30">
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedAccounts.length)} of {sortedAccounts.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
