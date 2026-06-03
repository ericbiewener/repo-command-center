import { Folder, GitBranch } from "lucide-react";
import type { WorkstreamRepoGroup } from "../utils/groupWorkstreams";
import WorkstreamCard from "./WorkstreamCard";

type StatusGroupProps = {
  group: WorkstreamRepoGroup;
  onOpenRepo: (repoPath: string) => void;
};

const formatItemCount = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

const StatusGroup = ({ group, onOpenRepo }: StatusGroupProps) => (
  <section className="repo-section" id={`repo-section-${group.repoKey}`}>
    <div className="repo-heading">
      <h2>
        <Folder size={15} />
        {group.repoName}
      </h2>
      <span>{formatItemCount(group.items.length)}</span>
    </div>
    <div className="branch-list">
      {group.branches.map((branchGroup) => (
        <section
          className="branch-section"
          key={`${group.repoKey}-${branchGroup.branch}`}
          id={`branch-section-${group.repoKey}-${branchGroup.branch}`}
        >
          <div className="branch-heading">
            <h3>
              <GitBranch size={14} />
              {branchGroup.branch}
            </h3>
            <span>{formatItemCount(branchGroup.items.length)}</span>
          </div>
          <div className="card-list">
            {branchGroup.items.map((workstream) => (
              <WorkstreamCard
                key={workstream.statusFilePath}
                workstream={workstream}
                onOpenRepo={onOpenRepo}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  </section>
);

export default StatusGroup;
