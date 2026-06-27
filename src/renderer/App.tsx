import fuzzysort from "fuzzysort";
import { Layers, LayoutList, Loader2, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ResolvedCustomAction } from "../shared/settings";
import type { AppInfo, Workstream } from "../shared/types";
import EmptyState from "./components/EmptyState";
import ErrorPanel from "./components/ErrorPanel";
import WorkstreamTable from "./components/WorkstreamTable";
import { groupWorkstreams } from "./utils/groupWorkstreams";

type DevLogEntry =
  | { type: "exec"; cmd: string; args: string[]; stdout: string; stderr: string }
  | { type: "exec:error"; cmd: string; args: string[]; error: string }
  | { type: "spawn"; cmd: string; args: string[] }
  | {
      type: "spawn:done";
      cmd: string;
      args: string[];
      stdout: string;
      stderr: string;
      exitCode: number | null;
    };

type Toast = { id: number; text: string };

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customActions, setCustomActions] = useState<ResolvedCustomAction[]>([]);
  const [query, setQuery] = useState("");
  const [unified, setUnified] = useState(() => localStorage.getItem("cc-unified-view") === "true");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const workstreamsRef = useRef(workstreams);
  workstreamsRef.current = workstreams;

  const refreshFast = useCallback(() => {
    const gitStatusCache = Object.fromEntries(
      workstreamsRef.current.map((ws) => [ws.statusFilePath, ws.gitStatus]),
    );
    void window.appApi.listWorkstreams(gitStatusCache).then(setWorkstreams);
  }, []);
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

  useEffect(
    () =>
      window.appApi.onDevLog((raw) => {
        const entry = raw as DevLogEntry;
        entry.type === "exec"
          ? (console.groupCollapsed(`[bash] ${entry.cmd} ${entry.args.join(" ")}`),
            entry.stdout && console.log("stdout:", entry.stdout),
            entry.stderr && console.log("stderr:", entry.stderr),
            console.groupEnd())
          : entry.type === "exec:error"
            ? (console.group(`[bash:error] ${entry.cmd} ${entry.args.join(" ")}`),
              console.error("error:", entry.error),
              console.groupEnd())
            : entry.type === "spawn:done"
              ? (console.group(
                  `[bash:spawn:done] ${entry.cmd} ${entry.args.join(" ")} (exit ${entry.exitCode})`,
                ),
                entry.stdout && console.log("stdout:", entry.stdout),
                entry.stderr && console.log("stderr:", entry.stderr),
                console.groupEnd())
              : console.log(`[bash:spawn] ${entry.cmd} ${entry.args.join(" ")}`);
        if (entry.type === "spawn:done") {
          if (entry.stderr) {
            const id = ++toastIdRef.current;
            setToasts((prev) => [...prev, { id, text: entry.stderr }]);
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
          }
          refreshFast();
        }
      }),
    [refreshFast],
  );

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

  const toggleUnified = useCallback(() => {
    setUnified((prev) => {
      const next = !prev;
      localStorage.setItem("cc-unified-view", String(next));
      return next;
    });
  }, []);

  const filteredWorkstreams = useMemo(
    () =>
      query.trim()
        ? fuzzysort.go(query, workstreams, { key: "branch" }).map((r) => r.obj)
        : workstreams,
    [workstreams, query],
  );

  const groups = useMemo(() => groupWorkstreams(filteredWorkstreams), [filteredWorkstreams]);

  const sortedWorkstreams = useMemo(
    () =>
      unified
        ? [...filteredWorkstreams].sort((a, b) => (b.updatedAtEpoch ?? 0) - (a.updatedAtEpoch ?? 0))
        : [],
    [filteredWorkstreams, unified],
  );

  const flatWorkstreams = useMemo(
    () => (unified ? sortedWorkstreams : groups.flatMap((g) => g.items)),
    [unified, sortedWorkstreams, groups],
  );

  // Derive selected index from anchorPath — falls back to 0 when the anchor isn't visible
  const anchoredIndex = useMemo(
    () => flatWorkstreams.findIndex((w) => w.statusFilePath === anchorPath),
    [flatWorkstreams, anchorPath],
  );
  const effectiveIndex = anchoredIndex >= 0 ? anchoredIndex : 0;
  const selectedWorkstream = flatWorkstreams[effectiveIndex] ?? null;

  const handleForceRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refresh(), window.appApi.refreshPrStatus()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Keyboard navigation — arrow keys move selection, Enter triggers action, Cmd+Backspace/Delete triggers deleteAction
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
      } else if (event.key === "Enter" && selectedWorkstream) {
        void window.appApi.executeAction(selectedWorkstream.repoPath, selectedWorkstream.branch);
        refreshFast();
      } else if (
        event.metaKey &&
        !event.shiftKey &&
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedWorkstream
      ) {
        event.preventDefault();
        void window.appApi.executeDeleteAction(
          selectedWorkstream.repoPath,
          selectedWorkstream.branch,
        );
        refreshFast();
      } else if (
        event.metaKey &&
        event.shiftKey &&
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedWorkstream
      ) {
        event.preventDefault();
        void window.appApi.executeDeleteActionSecondary(
          selectedWorkstream.repoPath,
          selectedWorkstream.branch,
        );
        refreshFast();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flatWorkstreams, effectiveIndex, selectedWorkstream, refreshFast]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === "r") {
        event.preventDefault();
        void handleForceRefresh();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleForceRefresh]);

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

  return (
    <>
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
          <AnimatePresence>
            {isRefreshing ? (
              <motion.span
                key="refresh-spinner"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Loader2 size={14} className="search-icon spin" />
              </motion.span>
            ) : null}
          </AnimatePresence>
          <button
            type="button"
            className="view-toggle-btn"
            title={unified ? "Switch to grouped view" : "Switch to flat view"}
            aria-label={unified ? "Switch to grouped view" : "Switch to flat view"}
            onClick={toggleUnified}
          >
            {unified ? <Layers size={15} /> : <LayoutList size={15} />}
          </button>
        </div>
        <ErrorPanel message={error} invalidWorkstreams={invalidWorkstreams} />

        {!isLoading && groups.length === 0 ? (
          <EmptyState statusRoot={appInfo?.statusRoot ?? "~/.ai-work-status"} />
        ) : (
          <div className="groups">
            <WorkstreamTable
              groups={groups}
              customActions={customActions}
              selectedStatusFilePath={selectedWorkstream?.statusFilePath ?? null}
              onAction={refreshFast}
              unified={unified}
              sortedWorkstreams={sortedWorkstreams}
            />
          </div>
        )}
      </main>
      <div className="toast-layer">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className="toast-item"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              <span className="toast-label">stderr</span>
              <pre className="toast-text">{toast.text}</pre>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

const App = () => (window.appApi ? <DashboardApp /> : <BridgeUnavailable />);

export default App;
