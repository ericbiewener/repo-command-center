import { Folder, GitBranch } from "lucide-react";
import type { WorkstreamRepoGroup } from "../utils/groupWorkstreams";
import WorkstreamCard from "./WorkstreamCard";

type StatusGroupProps = {
  group: WorkstreamRepoGroup;
  onOpenRepo: (repoPath: string) => void;
};

const StatusGroup = ({ group, onOpenRepo }: StatusGroupProps) => (
  <section className="repo-section" id={`repo-section-${group.repoKey}`}>
    <div className="repo-heading">
      <h2>{group.repoName}</h2>
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
              <GitBranch size={20} />
              <div>{branchGroup.branch}</div>
            </h3>
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
