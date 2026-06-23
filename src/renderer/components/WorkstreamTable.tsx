import { Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import type { ResolvedCustomAction } from "../../shared/settings";
import type { WorkstreamRepoGroup } from "../utils/groupWorkstreams";
import CreateWorktreeModal from "./CreateWorktreeModal";
import WorkstreamCard from "./WorkstreamCard";

type GroupSectionProps = {
  group: WorkstreamRepoGroup;
  customActions: ResolvedCustomAction[];
  selectedStatusFilePath: string | null;
  columnCount: number;
  onAction: () => void;
};

const GroupSection = ({
  group,
  customActions,
  selectedStatusFilePath,
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
  onAction: () => void;
};

const WorkstreamTable = ({
  groups,
  customActions,
  selectedStatusFilePath,
  onAction,
}: WorkstreamTableProps) => {
  const hasActions = customActions.length > 0;
  const columnCount = hasActions ? 8 : 7;
  return (
    <table className="workstream-table">
      <thead>
        <tr>
          <th>Branch</th>
          <th>Title</th>
          <th>Status</th>
          <th title="Uncommitted files or unpushed commits">Δ</th>
          <th>PR</th>
          <th>CI</th>
          {hasActions ? <th>Actions</th> : null}
          <th className="col-description">Description</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => (
          <GroupSection
            key={group.repoKey}
            group={group}
            customActions={customActions}
            selectedStatusFilePath={selectedStatusFilePath}
            columnCount={columnCount}
            onAction={onAction}
          />
        ))}
      </tbody>
    </table>
  );
};

export default WorkstreamTable;
