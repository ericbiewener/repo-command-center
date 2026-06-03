import { Folder, GitBranch } from "lucide-react";
import type { WorkstreamRepoGroup } from "../utils/groupWorkstreams";

type SidebarProps = {
  groups: WorkstreamRepoGroup[];
};

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const Sidebar = ({ groups }: SidebarProps) => (
  <nav className="sidebar">
    {groups.map((group) => (
      <div key={group.repoKey} className="sidebar-repo">
        <button type="button" onClick={() => scrollTo(`repo-section-${group.repoKey}`)}>
          <Folder size={13} />
          {group.repoName}
        </button>
        {group.branches.map((branchGroup) => (
          <button
            key={branchGroup.branch}
            type="button"
            className="sidebar-branch"
            onClick={() => scrollTo(`branch-section-${group.repoKey}-${branchGroup.branch}`)}
          >
            <GitBranch size={12} />
            {branchGroup.branch}
          </button>
        ))}
      </div>
    ))}
  </nav>
);

export default Sidebar;
