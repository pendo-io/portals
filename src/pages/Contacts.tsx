import { ContactsToolbar } from "@/components/contacts/ContactsToolbar";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { useContacts, useSearchAllContacts } from "@/hooks/useContacts";
import { useSalesforce } from "@/hooks/useSalesforce";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Contact2, ChevronLeft, ChevronRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SFDCContact } from "@/types/salesforce";

const PAGE_SIZE = 50;

const SEARCH_ALL_KEY = "pendogtm-search-all-contacts";

export default function Contacts() {
  const navigate = useNavigate();
  const { sfdcLoading, sfdcAccessToken } = useSalesforce();
  const [searchAll, setSearchAll] = useState<boolean>(() => {
    return localStorage.getItem(SEARCH_ALL_KEY) === "true";
  });

  const [search, setSearch] = useState("");

  const { data: myContacts, isLoading: isLoadingMy, error: errorMy } = useContacts();
  const { data: searchResults, isLoading: isLoadingSearch, error: errorSearch } = useSearchAllContacts(search, searchAll);

  const contacts = searchAll ? searchResults : myContacts;
  const isLoading = searchAll ? isLoadingSearch : (isLoadingMy || sfdcLoading || (!myContacts && !errorMy));
  const error = searchAll ? errorSearch : errorMy;

  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const handleSearchAllChange = (value: boolean) => {
    setSearchAll(value);
    localStorage.setItem(SEARCH_ALL_KEY, String(value));
    window.dispatchEvent(new Event("contacts-toggle"));
    setSearch("");
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleDepartmentFilterChange = (value: string) => {
    setDepartmentFilter(value);
    setPage(0);
  };

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((contact: SFDCContact) => {
      const matchesSearch =
        searchAll || !search ||
        contact.Name.toLowerCase().includes(search.toLowerCase()) ||
        contact.Email?.toLowerCase().includes(search.toLowerCase()) ||
        contact.Title?.toLowerCase().includes(search.toLowerCase());

      const matchesDepartment =
        departmentFilter === "all" || contact.Department === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [contacts, search, searchAll, departmentFilter]);

  const departments = useMemo(() => {
    if (!contacts) return [];
    const set = new Set(contacts.map((c: SFDCContact) => c.Department).filter(Boolean));
    return [...set].sort() as string[];
  }, [contacts]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));
  const paginatedContacts = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredContacts.slice(start, start + PAGE_SIZE);
  }, [filteredContacts, page]);

  if (!sfdcLoading && !sfdcAccessToken) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Contact2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-section-title">Connect Salesforce</h2>
          <p className="text-muted-foreground">
            Sign in with your Salesforce account to view your contacts here.
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
      <ContactsToolbar
        search={search}
        onSearchChange={handleSearchChange}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={handleDepartmentFilterChange}
        departments={departments}
        totalCount={contacts?.length || 0}
        filteredCount={filteredContacts.length}
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
                <p className="text-destructive font-medium">Failed to load contacts</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading contacts...</p>
            </div>
          </div>
        ) : searchAll && search.trim().length < 2 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Contact2 className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Search by name or email to find contacts across Salesforce.</p>
          </div>
        ) : (
          <ContactsTable contacts={paginatedContacts} />
        )}
      </div>
      {totalPages > 1 && (
        <div className="border-t border-border/50 px-3 sm:px-6 py-3 flex items-center justify-between bg-card/30">
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredContacts.length)} of {filteredContacts.length}
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
