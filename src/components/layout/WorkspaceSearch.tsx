import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { searchWorkspace, type WorkspaceSearchResult } from "../../lib/workspaceSearch";

export function WorkspaceSearch({ tenantId, onNavigate }: { tenantId: string; onNavigate: (page: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [active, setActive] = useState(-1);
  const request = useRef(0);
  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 3) {
      setResults([]);
      setStatus("idle");
      setActive(-1);
      return;
    }
    const sequence = ++request.current;
    setStatus("loading");
    const timer = window.setTimeout(() => {
      searchWorkspace(tenantId, normalized)
        .then(({ results: items }) => {
          if (sequence !== request.current) return;
          setResults(items);
          setStatus("ready");
          setActive(-1);
        })
        .catch(() => {
          if (sequence !== request.current) return;
          setResults([]);
          setStatus("error");
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, tenantId]);
  const open = (result: WorkspaceSearchResult) => {
    onNavigate(result.page);
    setQuery("");
    setResults([]);
    setStatus("idle");
  };
  const visible = query.trim().length >= 3;
  return (
    <div className="workspace-search">
      <Search aria-hidden="true" />
      <label className="sr-only" htmlFor="workspace-search-input">Search workspace</label>
      <input
        id="workspace-search-input"
        type="search"
        value={query}
        placeholder="Search workspace"
        autoComplete="off"
        aria-expanded={visible}
        aria-controls="workspace-search-results"
        aria-activedescendant={active >= 0 ? `workspace-result-${active}` : undefined}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, results.length - 1)); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
          if (event.key === "Enter" && active >= 0 && results[active]) { event.preventDefault(); open(results[active]); }
          if (event.key === "Escape") { setQuery(""); setResults([]); setStatus("idle"); }
        }}
      />
      {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear workspace search"><X /></button>}
      {visible && (
        <div className="workspace-search-results" id="workspace-search-results" role="listbox" aria-label="Workspace search results">
          {status === "loading" && <p role="status">Searching authorized workspace…</p>}
          {status === "error" && <p role="alert">Search is temporarily unavailable.</p>}
          {status === "ready" && results.length === 0 && <p role="status">No authorized results found.</p>}
          {status === "ready" && results.map((result, index) => (
            <button
              type="button"
              role="option"
              aria-selected={index === active}
              id={`workspace-result-${index}`}
              className={index === active ? "workspace-search-result workspace-search-result--active" : "workspace-search-result"}
              key={`${result.type}-${result.id}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => open(result)}
            >
              <span>{result.type}</span><strong>{result.title}</strong><small>{result.detail}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
