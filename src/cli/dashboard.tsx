#!/usr/bin/env node
import fs from "node:fs";
import fuzzy from "fuzzy";
import { Box, render, Text, useApp, useInput, useStdin } from "ink";
import { useEffect, useMemo, useState } from "react";
import type { WorkstreamRepoGroup } from "../renderer/utils/groupWorkstreams.js";
import { groupWorkstreams } from "../renderer/utils/groupWorkstreams.js";
import { getStatusReposDir } from "../shared/paths.js";
import { listWorkstreams } from "../shared/readStatusFiles.js";
import type { Workstream } from "../shared/types.js";

const getSearchText = (ws: Workstream) => [ws.repoName, ws.branch].filter(Boolean).join(" ");

// Set before exit so the shell wrapper can capture it via stdout.
let exitPath: string | null = null;

const WorkstreamRow = ({
  workstream,
  branch,
  selected,
}: {
  workstream: Workstream;
  branch: string;
  selected: boolean;
}) => {
  const title =
    workstream.title ||
    (workstream.repoName && workstream.branch
      ? `${workstream.repoName} / ${workstream.branch}`
      : "Invalid status file");

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box gap={2}>
        <Text color={selected ? "greenBright" : undefined} bold={selected} dimColor={!selected}>
          {branch}
        </Text>
        <Text color={selected ? "yellow" : undefined} bold={selected}>
          {title}
        </Text>
      </Box>
      {workstream.summary && (
        <Box marginLeft={2}>
          <Text color={selected ? "white" : undefined} dimColor={!selected}>
            {workstream.summary}
          </Text>
        </Box>
      )}
      {!workstream.isValid &&
        workstream.validationErrors.map((err) => (
          <Box key={err} marginLeft={2}>
            <Text color="red">{err}</Text>
          </Box>
        ))}
    </Box>
  );
};

const BranchSection = ({
  branch,
  items,
  selectedId,
}: {
  branch: string;
  items: Workstream[];
  selectedId: string | undefined;
}) => (
  <Box flexDirection="column" marginBottom={1}>
    {items.map((ws) => (
      <WorkstreamRow
        key={ws.statusFilePath}
        workstream={ws}
        branch={branch}
        selected={ws.statusFilePath === selectedId}
      />
    ))}
  </Box>
);

const RepoSection = ({
  group,
  selectedId,
}: {
  group: WorkstreamRepoGroup;
  selectedId: string | undefined;
}) => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold color="blueBright">
      {" "}
      {group.repoName}
    </Text>
    {group.branches.map((bg) => (
      <BranchSection key={bg.branch} branch={bg.branch} items={bg.items} selectedId={selectedId} />
    ))}
  </Box>
);

const Dashboard = () => {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const [allGroups, setAllGroups] = useState<WorkstreamRepoGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      const workstreams = await listWorkstreams();
      setAllGroups(groupWorkstreams(workstreams));
      setLoading(false);
    };

    void refresh();

    const reposDir = getStatusReposDir();
    let watcher: fs.FSWatcher | null = null;
    try {
      watcher = fs.watch(reposDir, { recursive: true }, () => void refresh());
    } catch {
      // Directory may not exist yet
    }

    return () => watcher?.close();
  }, []);

  const { filteredGroups, flatItems } = useMemo(() => {
    const filter = (ws: Workstream) => !query || fuzzy.test(query, getSearchText(ws));
    const filtered = allGroups
      .map((group) => ({
        ...group,
        branches: group.branches
          .map((bg) => ({ ...bg, items: bg.items.filter(filter) }))
          .filter((bg) => bg.items.length > 0),
      }))
      .filter((g) => g.branches.length > 0);

    return {
      filteredGroups: filtered,
      flatItems: filtered.flatMap((g) => g.branches.flatMap((b) => b.items)),
    };
  }, [allGroups, query]);

  const clampedIndex = Math.min(selectedIndex, Math.max(0, flatItems.length - 1));
  const selectedId = flatItems[clampedIndex]?.statusFilePath;

  useInput(
    (input, key) => {
      if (key.return) {
        const selected = flatItems[clampedIndex];
        if (selected?.repoPath) exitPath = selected.repoPath;
        exit();
      } else if (key.escape) {
        exit();
      } else if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(flatItems.length - 1, i + 1));
      } else if (key.backspace || key.delete) {
        setQuery((q) => q.slice(0, -1));
        setSelectedIndex(0);
      } else if (input && !key.ctrl && !key.meta) {
        setQuery((q) => q + input);
        setSelectedIndex(0);
      }
    },
    { isActive: isRawModeSupported },
  );

  if (loading) return <Text>Loading...</Text>;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} gap={1}>
        <Text bold color="green">
          {">"}
        </Text>
        <Text>{query}</Text>
        <Text dimColor>_</Text>
      </Box>

      {flatItems.length === 0 ? (
        <Box marginBottom={1}>
          <Text dimColor>{allGroups.length === 0 ? "No workstreams found." : "No matches."}</Text>
        </Box>
      ) : (
        filteredGroups.map((group) => (
          <RepoSection key={group.repoKey} group={group} selectedId={selectedId} />
        ))
      )}

      <Box marginTop={1}>
        <Text dimColor>[↑↓] navigate [enter] cd to repo [esc] quit</Text>
      </Box>
    </Box>
  );
};

// Render the TUI on stderr so stdout stays clean for the shell wrapper to capture.
const { waitUntilExit } = render(<Dashboard />, { stdout: process.stderr });
await waitUntilExit();

// Shell wrapper reads this from stdout: cd $(ai-work-dashboard)
if (exitPath) process.stdout.write(exitPath);
