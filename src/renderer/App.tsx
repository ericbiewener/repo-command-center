import fuzzysort from "fuzzysort";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ResolvedCustomAction } from "../shared/settings";
import type { AppInfo, Workstream } from "../shared/types";
import EmptyState from "./components/EmptyState";
import ErrorPanel from "./components/ErrorPanel";
import WorkstreamTable from "./components/WorkstreamTable";
import { groupWorkstreams } from "./utils/groupWorkstreams";

const BridgeUnavailable = () => (
  <main className="app-shell">
    <section className="empty-state">
      <h2>Electron preload bridge unavailable.</h2>
      <p>Run this dashboard inside the Electron app with:</p>
      <code>pnpm dev</code>
    </section>
  </main>
);

const DashboardApp = () => {
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customActions, setCustomActions] = useState<ResolvedCustomAction[]>([]);
  const [query, setQuery] = useState("");
  // Track selected item by statusFilePath so it survives filter changes gracefully
  const [anchorPath, setAnchorPath] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    await Promise.all([window.appApi.listWorkstreams(), window.appApi.getAppInfo()])
      .then(([items, info]) => {
        setWorkstreams(items);
        setAppInfo(info);
      })
      .catch((refreshError: unknown) => {
        setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    window.appApi
      .getCustomActions()
      .then(setCustomActions)
      .catch(() => {
        // non-fatal
      });
  }, []);

  useEffect(() => {
    void refresh();

    const removeUpdatedListener = window.appApi.onWorkstreamsUpdated(() => {
      void refresh();
    });
    const removeShownListener = window.appApi.onDashboardShown(() => {
      void refresh();
      searchInputRef.current?.focus();
    });
    return () => {
      removeUpdatedListener();
      removeShownListener();
    };
  }, [refresh]);

  const filteredWorkstreams = useMemo(
    () =>
      query.trim()
        ? fuzzysort.go(query, workstreams, { key: "branch" }).map((r) => r.obj)
        : workstreams,
    [workstreams, query],
  );

  const groups = useMemo(() => groupWorkstreams(filteredWorkstreams), [filteredWorkstreams]);
  const flatWorkstreams = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Derive selected index from anchorPath — falls back to 0 when the anchor isn't visible
  const anchoredIndex = useMemo(
    () => flatWorkstreams.findIndex((w) => w.statusFilePath === anchorPath),
    [flatWorkstreams, anchorPath],
  );
  const effectiveIndex = anchoredIndex >= 0 ? anchoredIndex : 0;
  const selectedWorkstream = flatWorkstreams[effectiveIndex] ?? null;

  // Keyboard navigation — arrow keys move selection, Enter triggers first custom action
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIdx = Math.min(effectiveIndex + 1, flatWorkstreams.length - 1);
        setAnchorPath(flatWorkstreams[nextIdx]?.statusFilePath ?? null);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevIdx = Math.max(effectiveIndex - 1, 0);
        setAnchorPath(flatWorkstreams[prevIdx]?.statusFilePath ?? null);
      } else if (event.key === "Enter" && selectedWorkstream && customActions.length > 0) {
        void window.appApi.executeCustomAction(0, selectedWorkstream.repoPath);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flatWorkstreams, effectiveIndex, selectedWorkstream, customActions]);

  // Scroll selected row into view on navigation
  useEffect(() => {
    if (selectedWorkstream) {
      document.querySelector('[data-selected="true"]')?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedWorkstream]);

  const invalidWorkstreams = useMemo(
    () => workstreams.filter((workstream) => !workstream.isValid),
    [workstreams],
  );

  const openRepo = useCallback((repoPath: string) => {
    window.appApi.openInVSCode(repoPath).then((result) => {
      setError(result.ok ? null : result.error);
    });
  }, []);

  return (
    <main className="app-shell">
      <div className="search-wrapper">
        <Search size={15} className="search-icon" />
        <input
          ref={searchInputRef}
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search worktrees…"
          // biome-ignore lint/a11y/noAutofocus: intentional — this is a launcher UI
          autoFocus
          spellCheck={false}
        />
      </div>
      <ErrorPanel message={error} invalidWorkstreams={invalidWorkstreams} />

      {!isLoading && groups.length === 0 ? (
        <EmptyState statusRoot={appInfo?.statusRoot ?? "~/.ai-work-status"} />
      ) : (
        <div className="groups">
          <WorkstreamTable
            groups={groups}
            onOpenRepo={openRepo}
            customActions={customActions}
            selectedStatusFilePath={selectedWorkstream?.statusFilePath ?? null}
          />
        </div>
      )}
    </main>
  );
};

const App = () => (window.appApi ? <DashboardApp /> : <BridgeUnavailable />);

export default App;
