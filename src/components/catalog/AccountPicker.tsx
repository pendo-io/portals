import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { AccountLogo } from "@/components/accounts/AccountLogo";
import { Search, X, Loader2 } from "lucide-react";
import { useSalesforce } from "@/hooks/useSalesforce";
import { searchAccounts } from "@/services/salesforce";
import type { SFDCAccount } from "@/types/salesforce";

interface AccountPickerProps {
  selected: SFDCAccount | null;
  onSelect: (account: SFDCAccount | null) => void;
}

export function AccountPicker({ selected, onSelect }: AccountPickerProps) {
  const { sfdcAccessToken, sfdcInstanceUrl } = useSalesforce();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SFDCAccount[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2 || !sfdcAccessToken || !sfdcInstanceUrl) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchAccounts(sfdcAccessToken, sfdcInstanceUrl, query);
        setResults(res.records as SFDCAccount[]);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sfdcAccessToken, sfdcInstanceUrl]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground shrink-0">Run for:</span>
        <AccountLogo domain={selected.Domain_Name__c} name={selected.Name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight truncate">{selected.Name}</p>
          {selected.Website && (
            <p className="text-xs text-muted-foreground truncate">
              {selected.Website.replace(/^https?:\/\/(www\.)?/, "")}
            </p>
          )}
        </div>
        <button
          onClick={() => onSelect(null)}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground shrink-0">Run for:</span>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for an account..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="pl-10 h-9"
          />
        </div>
        {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-popover shadow-md max-h-[280px] overflow-y-auto">
          {searching && results.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No accounts found
            </div>
          ) : (
            results.map((account) => (
              <button
                key={account.Id}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-muted transition-colors"
                onClick={() => {
                  onSelect(account);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <AccountLogo domain={account.Domain_Name__c} name={account.Name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight truncate">{account.Name}</p>
                  {account.Website && (
                    <p className="text-xs text-muted-foreground truncate">
                      {account.Website.replace(/^https?:\/\/(www\.)?/, "")}
                    </p>
                  )}
                </div>
                {account.Industry && (
                  <span className="text-xs text-muted-foreground shrink-0">{account.Industry}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
