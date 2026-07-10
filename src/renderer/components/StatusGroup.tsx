import { Plus } from "lucide-react";
import { useState } from "react";
import type { ResolvedCustomAction } from "../../shared/settings";
import type { WorkstreamRepoGroup } from "../utils/groupWorkstreams";
import CreateWorktreeModal from "./CreateWorktreeModal";
import WorkstreamCard from "./WorkstreamCard";

type StatusGroupProps = {
  group: WorkstreamRepoGroup;
  customActions: ResolvedCustomAction[];
};

const StatusGroup = ({ group, customActions }: StatusGroupProps) => {
  const [showModal, setShowModal] = useState(false);
  const repoPath = group.items[0]?.repoPath ?? "";

  return (
    <section className="repo-section" id={`repo-section-${group.repoKey}`}>
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
        {showModal && repoPath ? (
          <CreateWorktreeModal
            repoPath={repoPath}
            repoName={group.repoName}
            onClose={() => setShowModal(false)}
          />
        ) : null}
      </div>

      <table className="workstream-table">
        <colgroup>
          <col className="col-branch" />
          <col className="col-title" />
          <col className="col-local-changes" />
          <col className="col-pr" />
          <col className="col-ci" />
          <col className="col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>Branch</th>
            <th>Title</th>
            <th>PR</th>
            <th>CI</th>
            <th title="Uncommitted files or unpushed commits">Δ</th>
            <th>Actions</th>
            <th className="spacer" />
          </tr>
        </thead>
        <tbody>
          {group.items.map((workstream) => (
            <WorkstreamCard
              key={workstream.statusFilePath}
              workstream={workstream}
              customActions={customActions}
              isSelected={false}
              onAction={async () => {}}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default StatusGroup;
