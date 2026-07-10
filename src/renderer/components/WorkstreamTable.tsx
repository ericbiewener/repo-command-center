import { Plus, Trash2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import type { ResolvedCustomAction } from "../../shared/settings";
import type { Workstream } from "../../shared/types";
import type { WorkstreamRepoGroup } from "../utils/groupWorkstreams";
import CreateWorktreeModal from "./CreateWorktreeModal";
import WorkstreamCard from "./WorkstreamCard";

type GroupSectionProps = {
  group: WorkstreamRepoGroup;
  customActions: ResolvedCustomAction[];
  selectedStatusFilePath: string | null;
  pendingStatusFilePaths: Record<string, boolean>;
  columnCount: number;
  onAction: (workstream: Workstream, action: () => Promise<unknown>) => Promise<void>;
};

const GroupSection = ({
  group,
  customActions,
  selectedStatusFilePath,
  pendingStatusFilePaths,
  columnCount,
  onAction,
}: GroupSectionProps) => {
  const [showModal, setShowModal] = useState(false);
  const repoPath = group.items[0]?.repoPath ?? "";

  return (
    <>
      <tr className="repo-header-row" id={`repo-section-${group.repoKey}`}>
        <td colSpan={columnCount} className="repo-header-cell">
          <div className="repo-heading">
            <h2>{group.repoName}</h2>
            {repoPath ? (
              <button
                type="button"
                title={`Create worktree for ${group.repoName}`}
                aria-label={`Create worktree for ${group.repoName}`}
                onClick={() => setShowModal(true)}
              >
                <Plus size={14} />
              </button>
            ) : null}
            <AnimatePresence>
              {showModal && repoPath ? (
                <CreateWorktreeModal
                  key="modal"
                  repoPath={repoPath}
                  repoName={group.repoName}
                  onClose={() => setShowModal(false)}
                />
              ) : null}
            </AnimatePresence>
          </div>
        </td>
      </tr>
      {group.items.map((workstream) => (
        <WorkstreamCard
          key={workstream.statusFilePath}
          workstream={workstream}
          customActions={customActions}
          isSelected={workstream.statusFilePath === selectedStatusFilePath}
          isPending={pendingStatusFilePaths[workstream.statusFilePath] === true}
          onAction={onAction}
        />
      ))}
    </>
  );
};

type WorkstreamTableProps = {
  groups: WorkstreamRepoGroup[];
  customActions: ResolvedCustomAction[];
  selectedStatusFilePath: string | null;
  pendingStatusFilePaths: Record<string, boolean>;
  onAction: (workstream: Workstream, action: () => Promise<unknown>) => Promise<void>;
  unified?: boolean;
  sortedWorkstreams?: Workstream[];
};

const WorkstreamTable = ({
  groups,
  customActions,
  selectedStatusFilePath,
  pendingStatusFilePaths,
  onAction,
  unified = false,
  sortedWorkstreams = [],
}: WorkstreamTableProps) => {
  const hasActions = customActions.length > 0;
  const columnCount = hasActions ? 6 : 5;

  const mergedWorkstreams = groups
    .flatMap((g) => g.items)
    .filter((ws) => ws.prInfo !== null && !("fetchError" in ws.prInfo) && ws.prInfo.merged);

  const handleDeleteMerged = () => {
    for (const ws of mergedWorkstreams) {
      void onAction(ws, () => window.appApi.executeDeleteAction(ws.repoPath, ws.branch));
    }
  };

  return (
    <table className="workstream-table">
      <thead>
        <tr>
          {unified ? <th>Repo</th> : null}
          <th>Branch</th>
          <th>
            <div className="th-pr-header">
              PR
              {mergedWorkstreams.length > 0 ? (
                <button
                  type="button"
                  title="Delete all merged workstreams"
                  aria-label="Delete all merged workstreams"
                  className="delete-merged-btn"
                  onClick={handleDeleteMerged}
                >
                  <Trash2 size={10} />
                </button>
              ) : null}
            </div>
          </th>
          <th>CI</th>
          <th title="Uncommitted files or unpushed commits">Δ</th>
          {hasActions ? <th>Actions</th> : null}
          <th className="spacer" />
        </tr>
      </thead>
      <tbody>
        {unified
          ? sortedWorkstreams.map((ws) => (
              <WorkstreamCard
                key={ws.statusFilePath}
                workstream={ws}
                customActions={customActions}
                isSelected={ws.statusFilePath === selectedStatusFilePath}
                isPending={pendingStatusFilePaths[ws.statusFilePath] === true}
                showRepo
                onAction={onAction}
              />
            ))
          : groups.map((group) => (
              <GroupSection
                key={group.repoKey}
                group={group}
                customActions={customActions}
                selectedStatusFilePath={selectedStatusFilePath}
                pendingStatusFilePaths={pendingStatusFilePaths}
                columnCount={columnCount}
                onAction={onAction}
              />
            ))}
      </tbody>
    </table>
  );
};

export default WorkstreamTable;
