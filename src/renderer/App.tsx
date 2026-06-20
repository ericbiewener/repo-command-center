import { useCallback, useEffect, useMemo, useState } from "react";
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
    });
    return () => {
      removeUpdatedListener();
      removeShownListener();
    };
  }, [refresh]);

  const groups = useMemo(() => groupWorkstreams(workstreams), [workstreams]);
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
      <ErrorPanel message={error} invalidWorkstreams={invalidWorkstreams} />

      {!isLoading && groups.length === 0 ? (
        <EmptyState statusRoot={appInfo?.statusRoot ?? "~/.ai-work-status"} />
      ) : (
        <div className="groups">
          <WorkstreamTable groups={groups} onOpenRepo={openRepo} customActions={customActions} />
        </div>
      )}
    </main>
  );
};

const App = () => (window.appApi ? <DashboardApp /> : <BridgeUnavailable />);

export default App;
