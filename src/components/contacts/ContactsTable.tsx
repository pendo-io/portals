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
import { ArrowUp, ArrowDown } from "lucide-react";
import { AccountLogo } from "@/components/accounts/AccountLogo";
import type { SFDCContact } from "@/types/salesforce";

interface ContactsTableProps {
  contacts: SFDCContact[];
}

type SortKey = "Name" | "Title" | "Email" | "Department" | "Account";
type SortDir = "asc" | "desc";

function getSortValue(contact: SFDCContact, key: SortKey): string {
  switch (key) {
    case "Name":
      return contact.Name?.toLowerCase() || "";
    case "Title":
      return contact.Title?.toLowerCase() || "";
    case "Email":
      return contact.Email?.toLowerCase() || "";
    case "Department":
      return contact.Department?.toLowerCase() || "";
    case "Account":
      return contact.Account?.Name?.toLowerCase() || "";
  }
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("Name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...contacts].sort((a, b) => {
    const aVal = getSortValue(a, sortKey);
    const bVal = getSortValue(b, sortKey);
    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No contacts found
      </div>
    );
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" />
    );
  };

  const thClass = "font-semibold text-xs uppercase tracking-wider cursor-pointer select-none";

  return (
    <div className="w-full overflow-x-auto border-b">
      <Table className="[&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className={thClass} onClick={() => handleSort("Name")}>
              Name<SortIcon col="Name" />
            </TableHead>
            <TableHead className={`${thClass} hidden sm:table-cell`} onClick={() => handleSort("Title")}>
              Title<SortIcon col="Title" />
            </TableHead>
            <TableHead className={thClass} onClick={() => handleSort("Email")}>
              Email<SortIcon col="Email" />
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">
              Phone
            </TableHead>
            <TableHead className={`${thClass} hidden md:table-cell`} onClick={() => handleSort("Department")}>
              Department<SortIcon col="Department" />
            </TableHead>
            <TableHead className={thClass} onClick={() => handleSort("Account")}>
              Account<SortIcon col="Account" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((contact) => (
            <TableRow
              key={contact.Id}
              className="cursor-pointer hover:bg-muted/50 h-[52px]"
              onClick={() => navigate(`/contacts/${contact.Id}`)}
            >
              <TableCell className="py-2">
                <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
                  <AccountLogo
                    domain={contact.Account?.Domain_Name__c ?? null}
                    name={contact.Account?.Name || contact.Name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{contact.Name}</p>
                    {contact.Account?.Name && (
                      <p className="text-xs text-muted-foreground truncate">{contact.Account.Name}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-2 hidden sm:table-cell">
                <span className="text-sm text-muted-foreground">{contact.Title || "-"}</span>
              </TableCell>
              <TableCell className="py-2">
                {contact.Email ? (
                  <a
                    href={`mailto:${contact.Email}`}
                    className="text-sm text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {contact.Email}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="py-2 hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">{contact.Phone || "-"}</span>
              </TableCell>
              <TableCell className="py-2 hidden md:table-cell">
                <span className="text-sm text-muted-foreground">{contact.Department || "-"}</span>
              </TableCell>
              <TableCell className="py-2">
                {contact.Account ? (
                  <button
                    className="text-sm text-primary hover:underline text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/accounts/${contact.Account!.Id}`);
                    }}
                  >
                    {contact.Account.Name}
                  </button>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
