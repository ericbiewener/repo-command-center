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
  hiddenPaths: Record<string, boolean>;
  onAction: (workstream: Workstream, action: () => Promise<unknown>) => Promise<void>;
  onSelect: (workstream: Workstream) => void;
  onHide: (workstream: Workstream) => void;
};

const GroupSection = ({
  group,
  customActions,
  selectedStatusFilePath,
  pendingStatusFilePaths,
  hiddenPaths,
  onAction,
  onSelect,
  onHide,
}: GroupSectionProps) => {
  const [showModal, setShowModal] = useState(false);
  const repoPath = group.items[0]?.repoPath ?? "";

  return (
    <>
      <tr className="repo-header-row" id={`repo-section-${group.repoKey}`}>
        <td colSpan={6} className="repo-header-cell">
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
          isHidden={Boolean(hiddenPaths[workstream.statusFilePath])}
          isPending={pendingStatusFilePaths[workstream.statusFilePath] === true}
          onAction={onAction}
          onSelect={onSelect}
          onHide={onHide}
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
  hiddenPaths: Record<string, boolean>;
  onAction: (workstream: Workstream, action: () => Promise<unknown>) => Promise<void>;
  onSelect: (workstream: Workstream) => void;
  onHide: (workstream: Workstream) => void;
  unified?: boolean;
  sortedWorkstreams?: Workstream[];
};

const WorkstreamTable = ({
  groups,
  customActions,
  selectedStatusFilePath,
  pendingStatusFilePaths,
  hiddenPaths,
  onAction,
  onSelect,
  onHide,
  unified = false,
  sortedWorkstreams = [],
}: WorkstreamTableProps) => {
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
          <th className="col-actions" />
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
                isHidden={Boolean(hiddenPaths[ws.statusFilePath])}
                isPending={pendingStatusFilePaths[ws.statusFilePath] === true}
                showRepo
                onAction={onAction}
                onSelect={onSelect}
                onHide={onHide}
              />
            ))
          : groups.map((group) => (
              <GroupSection
                key={group.repoKey}
                group={group}
                customActions={customActions}
                selectedStatusFilePath={selectedStatusFilePath}
                pendingStatusFilePaths={pendingStatusFilePaths}
                hiddenPaths={hiddenPaths}
                onAction={onAction}
                onSelect={onSelect}
                onHide={onHide}
              />
            ))}
      </tbody>
    </table>
  );
};

export default WorkstreamTable;
