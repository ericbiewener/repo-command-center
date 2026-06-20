import { Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import type { ResolvedCustomAction } from "../../shared/settings";
import type { WorkstreamRepoGroup } from "../utils/groupWorkstreams";
import CreateWorktreeModal from "./CreateWorktreeModal";
import WorkstreamCard from "./WorkstreamCard";

const COLUMN_COUNT = 8;

type GroupSectionProps = {
  group: WorkstreamRepoGroup;
  onOpenRepo: (repoPath: string) => void;
  customActions: ResolvedCustomAction[];
  selectedStatusFilePath: string | null;
};

const GroupSection = ({
  group,
  onOpenRepo,
  customActions,
  selectedStatusFilePath,
}: GroupSectionProps) => {
  const [showModal, setShowModal] = useState(false);
  const repoPath = group.items[0]?.repoPath ?? "";

  return (
    <>
      <tr className="repo-header-row" id={`repo-section-${group.repoKey}`}>
        <td colSpan={COLUMN_COUNT} className="repo-header-cell">
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
          onOpenRepo={onOpenRepo}
          customActions={customActions}
          isSelected={workstream.statusFilePath === selectedStatusFilePath}
        />
      ))}
    </>
  );
};

type WorkstreamTableProps = {
  groups: WorkstreamRepoGroup[];
  onOpenRepo: (repoPath: string) => void;
  customActions: ResolvedCustomAction[];
  selectedStatusFilePath: string | null;
};

const WorkstreamTable = ({
  groups,
  onOpenRepo,
  customActions,
  selectedStatusFilePath,
}: WorkstreamTableProps) => (
  <table className="workstream-table">
    <thead>
      <tr>
        <th>Branch</th>
        <th>Title</th>
        <th>Status</th>
        <th title="Uncommitted files or unpushed commits">Δ</th>
        <th>PR</th>
        <th>CI</th>
        <th>Actions</th>
        <th className="col-description">Description</th>
      </tr>
    </thead>
    <tbody>
      {groups.map((group) => (
        <GroupSection
          key={group.repoKey}
          group={group}
          onOpenRepo={onOpenRepo}
          customActions={customActions}
          selectedStatusFilePath={selectedStatusFilePath}
        />
      ))}
    </tbody>
  </table>
);

export default WorkstreamTable;
