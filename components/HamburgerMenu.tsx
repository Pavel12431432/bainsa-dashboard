"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import SlidePanel from "./SlidePanel";

type Agent = "MARCO" | "SOFIA";

interface SearchResult {
  date: string;
  index: number;
  title: string;
  headline: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenAgentOutput: (agent: Agent) => void;
}

export default function HamburgerMenu({ open, onClose, onOpenAgentOutput }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  function onSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 300);
  }

  return (
    <SlidePanel side="left" open={open} title="MENU" onClose={onClose}>
      <div className="py-3 overflow-y-auto h-full">
        {/* Search */}
        <div className="px-6 py-2">
          <input
            type="text"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search stories..."
            className="w-full bg-border border border-border-mid rounded-md px-3 py-2 text-xs text-brand-white outline-none"
          />
        </div>

        {/* Search results */}
        {(results.length > 0 || (searched && query.trim().length >= 2)) && (
          <div className="px-2 py-1 max-h-[50vh] overflow-y-auto">
            {searching && (
              <p className="px-4 py-2 text-xs text-muted animate-pulse">Searching...</p>
            )}
            {!searching && results.length === 0 && searched && (
              <p className="px-4 py-2 text-xs text-muted">No results</p>
            )}
            {results.map((r, i) => (
              <Link
                key={`${r.date}-${r.index}-${i}`}
                href={`/stories/${r.date}?highlight=${r.index}`}
                onClick={onClose}
                className="block px-4 py-2.5 rounded-md text-left no-underline hover:bg-[#1a1a1a] transition-colors duration-150"
              >
                <span className="block text-xs text-brand-white opacity-70 leading-relaxed truncate">
                  {r.headline}
                </span>
                <span className="block text-[0.6rem] text-muted mt-0.5">
                  {r.date}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Divider between search and menu items */}
        {results.length > 0 && (
          <hr className="border-none border-t border-[#1f1f1f] my-3 mx-6" />
        )}

        {/* Agent outputs section */}
        <p className="px-6 py-2 text-[0.65rem] font-semibold text-brand-white opacity-25 tracking-[0.08em] uppercase">
          Agent Outputs
        </p>
        <button
          onClick={() => onOpenAgentOutput("MARCO")}
          className="w-full text-left px-6 py-3 text-[0.75rem] font-semibold text-brand-white opacity-55 hover:opacity-90 hover:bg-[#1a1a1a] transition-opacity duration-150 bg-transparent border-none cursor-pointer"
        >
          Marco Output
        </button>
        <button
          onClick={() => onOpenAgentOutput("SOFIA")}
          className="w-full text-left px-6 py-3 text-[0.75rem] font-semibold text-brand-white opacity-55 hover:opacity-90 hover:bg-[#1a1a1a] transition-opacity duration-150 bg-transparent border-none cursor-pointer"
        >
          Sofia Output
        </button>

        <hr className="border-none border-t border-[#1f1f1f] my-3 mx-6" />

        {/* Logout */}
        <a
          href="/api/auth/logout"
          className="block w-full text-left px-6 py-3 text-[0.75rem] font-semibold text-brand-white opacity-55 hover:opacity-90 hover:bg-[#1a1a1a] transition-opacity duration-150 no-underline"
        >
          Logout
        </a>
      </div>
    </SlidePanel>
  );
}
