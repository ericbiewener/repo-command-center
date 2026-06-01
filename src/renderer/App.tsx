import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppInfo, Workstream } from "../shared/types";
import EmptyState from "./components/EmptyState";
import ErrorPanel from "./components/ErrorPanel";
import Header from "./components/Header";
import SearchBox from "./components/SearchBox";
import StatusGroup from "./components/StatusGroup";
import { groupWorkstreams } from "./utils/groupWorkstreams";

const matchesQuery = (workstream: Workstream, query: string) => {
  const value = query.trim().toLowerCase();
  const haystack = [
    workstream.repoName,
    workstream.branch,
    workstream.title,
    workstream.summary,
    workstream.agent,
    workstream.status,
    workstream.rawStatus,
    workstream.repoPath,
    workstream.statusFilePath,
    workstream.markdownBody,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  return value ? haystack.includes(value) : true;
};

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
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

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
    void refresh();

    const removeUpdatedListener = window.appApi.onWorkstreamsUpdated(() => {
      void refresh();
    });
    const removeShownListener = window.appApi.onDashboardShown(() => {
      searchRef.current?.focus();
      void refresh();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void window.appApi.hideWindow();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      removeUpdatedListener();
      removeShownListener();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [refresh]);

  const filteredWorkstreams = useMemo(
    () =>
      workstreams
        .filter((workstream) => (showDone ? true : workstream.status !== "done"))
        .filter((workstream) => matchesQuery(workstream, query)),
    [query, showDone, workstreams],
  );
  const groups = useMemo(() => groupWorkstreams(filteredWorkstreams), [filteredWorkstreams]);
  const invalidWorkstreams = useMemo(
    () => workstreams.filter((workstream) => !workstream.isValid),
    [workstreams],
  );
  const activeCount = useMemo(
    () => workstreams.filter((workstream) => workstream.status !== "done").length,
    [workstreams],
  );

  const openRepo = useCallback((repoPath: string) => {
    window.appApi.openInVSCode(repoPath).then((result) => {
      setError(result.ok ? null : result.error);
    });
  }, []);

  return (
    <main className="app-shell">
      <Header activeCount={activeCount} appInfo={appInfo} />
      <SearchBox
        inputRef={searchRef}
        query={query}
        showDone={showDone}
        onQueryChange={setQuery}
        onShowDoneChange={setShowDone}
      />

      <div className="actions-row">
        <button type="button" onClick={() => void refresh()}>
          <RefreshCw className={isLoading ? "spin" : ""} size={16} />
          Refresh
        </button>
      </div>

      <ErrorPanel message={error} invalidWorkstreams={invalidWorkstreams} />

      {!isLoading && groups.length === 0 ? (
        <EmptyState statusRoot={appInfo?.statusRoot ?? "~/.ai-work-status"} />
      ) : (
        <div className="groups">
          {groups.map((group) => (
            <StatusGroup
              key={group.status}
              label={group.label}
              status={group.status}
              workstreams={group.items}
              onOpenRepo={openRepo}
            />
          ))}
        </div>
      )}
    </main>
  );
};

const App = () => (window.appApi ? <DashboardApp /> : <BridgeUnavailable />);

export default App;
