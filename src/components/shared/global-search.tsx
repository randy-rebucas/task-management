"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Search, CheckSquare, Users, Building2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchResults {
  tasks:   { _id: string; taskNumber?: string; title: string; status?: { name: string; color: string }; priority?: string }[];
  clients: { _id: string; name: string; company?: string; email?: string; status?: string }[];
  leads:   { _id: string; name: string; company?: string; email?: string; status?: string }[];
  users:   { _id: string; firstName: string; lastName: string; email?: string }[];
  total:   number;
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-red-500",
  high:   "text-orange-500",
  medium: "text-yellow-500",
  low:    "text-muted-foreground",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounce the query by 350 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((json) => { if (json.data) setResults(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const hasResults = results && results.total > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex items-center gap-2 h-9 w-48 justify-between text-muted-foreground text-sm px-3"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5" />
          Search…
        </span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          ⌘K
        </kbd>
      </Button>

      {/* Mobile icon button */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search tasks, clients, leads, staff…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching…
            </div>
          )}

          {!loading && debouncedQuery.length >= 2 && !hasResults && (
            <CommandEmpty>No results for &quot;{debouncedQuery}&quot;</CommandEmpty>
          )}

          {!loading && !hasResults && debouncedQuery.length < 2 && (
            <CommandEmpty>Start typing to search…</CommandEmpty>
          )}

          {hasResults && (
            <>
              {results.tasks.length > 0 && (
                <CommandGroup heading="Tasks">
                  {results.tasks.map((t) => (
                    <CommandItem
                      key={t._id}
                      value={`task-${t._id}`}
                      onSelect={() => navigate(`/tasks/${t._id}`)}
                      className="gap-2"
                    >
                      <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{t.title}</span>
                      {t.taskNumber && (
                        <span className="text-xs text-muted-foreground">{t.taskNumber}</span>
                      )}
                      {t.priority && (
                        <span className={`text-xs font-medium ${PRIORITY_COLOR[t.priority] ?? ""}`}>
                          {t.priority}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.tasks.length > 0 && (results.clients.length > 0 || results.leads.length > 0 || results.users.length > 0) && (
                <CommandSeparator />
              )}

              {results.clients.length > 0 && (
                <CommandGroup heading="Clients">
                  {results.clients.map((c) => (
                    <CommandItem
                      key={c._id}
                      value={`client-${c._id}`}
                      onSelect={() => navigate(`/crm/clients/${c._id}`)}
                      className="gap-2"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{c.name}</span>
                      {c.company && <span className="text-xs text-muted-foreground">{c.company}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.leads.length > 0 && (
                <CommandGroup heading="Leads">
                  {results.leads.map((l) => (
                    <CommandItem
                      key={l._id}
                      value={`lead-${l._id}`}
                      onSelect={() => navigate(`/crm/leads/${l._id}`)}
                      className="gap-2"
                    >
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{l.name}</span>
                      {l.status && <Badge variant="outline" className="text-[10px]">{l.status}</Badge>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.users.length > 0 && (
                <CommandGroup heading="Staff">
                  {results.users.map((u) => (
                    <CommandItem
                      key={u._id}
                      value={`user-${u._id}`}
                      onSelect={() => navigate(`/staff/${u._id}`)}
                      className="gap-2"
                    >
                      <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{u.firstName} {u.lastName}</span>
                      {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
