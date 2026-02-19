import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react";
import type { SFDCContact } from "@/types/salesforce";

interface AccountContactsTabProps {
  contacts: SFDCContact[];
  loading: boolean;
}

type SortField = "name" | "title" | "email" | "phone" | "department";
type SortDirection = "asc" | "desc";

export function AccountContactsTab({ contacts, loading }: AccountContactsTabProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.Name || "").localeCompare(b.Name || "");
          break;
        case "title":
          cmp = (a.Title || "").localeCompare(b.Title || "");
          break;
        case "email":
          cmp = (a.Email || "").localeCompare(b.Email || "");
          break;
        case "phone":
          cmp = (a.Phone || "").localeCompare(b.Phone || "");
          break;
        case "department":
          cmp = (a.Department || "").localeCompare(b.Department || "");
          break;
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });
  }, [contacts, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 inline-block ml-1" />
      : <ArrowDown className="h-3 w-3 inline-block ml-1" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No contacts found for this account
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border-b">
      <Table className="[&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("name")}
            >
              Name<SortIcon field="name" />
            </TableHead>
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground hidden sm:table-cell"
              onClick={() => handleSort("title")}
            >
              Title<SortIcon field="title" />
            </TableHead>
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("email")}
            >
              Email<SortIcon field="email" />
            </TableHead>
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground hidden lg:table-cell"
              onClick={() => handleSort("phone")}
            >
              Phone<SortIcon field="phone" />
            </TableHead>
            <TableHead
              className="font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground hidden md:table-cell"
              onClick={() => handleSort("department")}
            >
              Department<SortIcon field="department" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContacts.map((contact) => (
            <TableRow
              key={contact.Id}
              className="cursor-pointer hover:bg-muted/50 h-[52px]"
              onClick={() => navigate(`/contacts/${contact.Id}`)}
            >
              <TableCell className="py-2">
                <p className="font-medium text-sm leading-tight">{contact.Name}</p>
              </TableCell>
              <TableCell className="py-2 hidden sm:table-cell">
                <span className="text-sm text-muted-foreground">{contact.Title || "-"}</span>
              </TableCell>
              <TableCell className="py-2">
                {contact.Email ? (
                  <a href={`mailto:${contact.Email}`} className="text-sm text-primary hover:underline">
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
