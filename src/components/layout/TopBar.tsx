import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSalesforce } from "@/hooks/useSalesforce";
import { searchAccounts } from "@/services/salesforce";
import type { SFDCAccount, SFDCContact } from "@/types/salesforce";

function getHomeLabel(): string {
  let firstName = "";
  try {
    const raw = localStorage.getItem("sfdc_dev_session");
    if (raw) {
      const session = JSON.parse(raw);
      if (session.name) firstName = session.name.split(" ")[0];
    }
  } catch { /* ignore */ }
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${greeting}, ${firstName}` : greeting;
}

const ROUTE_LABELS: Record<string, string> = {
  "/accounts": "My Accounts",
  "/contacts": "My Contacts",
  "/signals": "My Signals",
  "/meetings": "My Meetings",
  "/meeting-analysis": "Meeting Analysis",
  "/workflows": "Workflows",
  "/workflows/create": "Create Workflow",
  "/workflows/manage": "Manage Workflows",
  "/will": "Ask Will",
  "/will-reasoning": "Ask Will Reasoning",
  "/ask-ace": "Ask Ace",
  "/ask-rfp": "Ask RFP",
  "/customer-engagement": "Customer Engagement",
  "/users": "Users",
  "/insights": "Insights",
  "/logs": "Logs",
  "/audit-logs": "Audit Logs",
  "/settings": "Settings",
};

const NAV_ITEMS = [
  { label: "My Accounts", path: "/accounts", group: "Workspace" },
  { label: "My Contacts", path: "/contacts", group: "Workspace" },
  { label: "My Meetings", path: "/meetings", group: "Workspace" },
  { label: "Meeting Analysis", path: "/meeting-analysis", group: "Research" },
  { label: "Workflows", path: "/workflows", group: "Tools" },
  { label: "Ask Will", path: "/will", group: "Tools" },
  { label: "Users", path: "/users", group: "Admin" },
  { label: "Insights", path: "/insights", group: "Admin" },
  { label: "Logs", path: "/logs", group: "Admin" },
  { label: "Audit Logs", path: "/audit-logs", group: "Admin" },
];

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { sfdcAccessToken, sfdcInstanceUrl } = useSalesforce();
  const queryClient = useQueryClient();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    window.addEventListener("accounts-toggle", handler);
    window.addEventListener("contacts-toggle", handler);
    return () => {
      window.removeEventListener("accounts-toggle", handler);
      window.removeEventListener("contacts-toggle", handler);
    };
  }, []);

  const debouncedSearch = useDebounce(search, 400);

  const { data: accountResults, isLoading: searchLoading } = useQuery({
    queryKey: ["sfdc-global-search", debouncedSearch],
    queryFn: async () => {
      if (!sfdcAccessToken || !sfdcInstanceUrl) return [];
      const result = await searchAccounts(sfdcAccessToken, sfdcInstanceUrl, debouncedSearch);
      return result.records as SFDCAccount[];
    },
    enabled: debouncedSearch.length >= 2 && !!sfdcAccessToken && !!sfdcInstanceUrl,
    staleTime: 60 * 1000,
  });

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset search when dialog closes
  useEffect(() => {
    if (!commandOpen) setSearch("");
  }, [commandOpen]);

  const currentPath = location.pathname;
  const isAllAccounts = currentPath === "/accounts" && localStorage.getItem("pendogtm-search-all-accounts") === "true";
  const isAllContacts = currentPath === "/contacts" && localStorage.getItem("pendogtm-search-all-contacts") === "true";
  const pageLabel = currentPath === "/"
    ? getHomeLabel()
    : currentPath === "/accounts"
      ? (isAllAccounts ? "All Accounts" : "My Accounts")
      : currentPath === "/contacts"
        ? (isAllContacts ? "All Contacts" : "My Contacts")
        : ROUTE_LABELS[currentPath] || currentPath.split("/").filter(Boolean).pop() || "Home";

  const isAccountDetail = currentPath.startsWith("/accounts/") && currentPath !== "/accounts";
  const isContactDetail = currentPath.startsWith("/contacts/") && currentPath !== "/contacts";
  const isMeetingDetail = currentPath.startsWith("/meetings/") && currentPath !== "/meetings";
  const accountsLabel = localStorage.getItem("pendogtm-search-all-accounts") === "true" ? "All Accounts" : "My Accounts";
  const contactsLabel = localStorage.getItem("pendogtm-search-all-contacts") === "true" ? "All Contacts" : "My Contacts";

  let accountDetailLabel = "Account Detail";
  if (isAccountDetail) {
    const accountId = currentPath.split("/accounts/")[1];
    const cachedAccount = queryClient.getQueryData<SFDCAccount>(["sfdc-account", accountId]);
    if (cachedAccount?.Name) accountDetailLabel = cachedAccount.Name;
  }

  let contactDetailLabel = "Contact Detail";
  if (isContactDetail) {
    const contactId = currentPath.split("/contacts/")[1];
    const cachedContact = queryClient.getQueryData<SFDCContact>(["sfdc-contact", contactId]);
    if (cachedContact?.Name) contactDetailLabel = cachedContact.Name;
  }

  const breadcrumbSegments = isAccountDetail
    ? [{ label: accountsLabel, path: "/accounts" }, { label: accountDetailLabel }]
    : isContactDetail
      ? [{ label: contactsLabel, path: "/contacts" }, { label: contactDetailLabel }]
      : isMeetingDetail
        ? [{ label: "My Meetings", path: "/meetings" }, { label: "Meeting Detail" }]
        : [{ label: pageLabel }];

  const navGroups = useMemo(() => {
    const groups = [...new Set(NAV_ITEMS.map((i) => i.group))];
    return groups.map((g) => ({ group: g, items: NAV_ITEMS.filter((i) => i.group === g) }));
  }, []);

  const showAccountResults = debouncedSearch.length >= 2;

  const filteredNavGroups = useMemo(() => {
    if (!search.trim()) return navGroups;
    const q = search.toLowerCase();
    return navGroups
      .map(({ group, items }) => ({
        group,
        items: items.filter((i) => i.label.toLowerCase().includes(q)),
      }))
      .filter(({ items }) => items.length > 0);
  }, [navGroups, search]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbSegments.map((seg, i) => (
              <BreadcrumbItem key={i}>
                {i > 0 && <BreadcrumbSeparator className="text-lg" />}
                {seg.path && i < breadcrumbSegments.length - 1 ? (
                  <BreadcrumbLink
                    className="text-lg cursor-pointer hover:underline"
                    onClick={() => navigate(seg.path!)}
                  >
                    {seg.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-lg font-semibold text-foreground">
                    {seg.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-muted-foreground"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search for anything...</span>
            <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          </Button>
        </div>
      </header>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput
          placeholder="Search for anything..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {search.length >= 2 && (searchLoading || search !== debouncedSearch)
              ? "Searching..."
              : "No results found."}
          </CommandEmpty>

          {/* Navigation items — always shown, filtered by search */}
          {filteredNavGroups.map(({ group, items }) => (
            <CommandGroup key={group} heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.path}
                  onSelect={() => {
                    navigate(item.path);
                    setCommandOpen(false);
                  }}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {/* SFDC Account Results */}
          {showAccountResults && accountResults && accountResults.length > 0 && (
            <CommandGroup heading={searchLoading ? "Accounts (searching...)" : `Accounts (${accountResults.length})`}>
              {accountResults.map((account) => (
                <CommandItem
                  key={account.Id}
                  value={`account-${account.Id}-${account.Name}`}
                  onSelect={() => {
                    navigate(`/accounts/${account.Id}`);
                    setCommandOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span>{account.Name}</span>
                    {account.Industry && (
                      <span className="text-xs text-muted-foreground">{account.Industry}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Loading indicator for account search */}
          {showAccountResults && searchLoading && (!accountResults || accountResults.length === 0) && (
            <CommandGroup heading="Accounts">
              <CommandItem disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching accounts...
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
