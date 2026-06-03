import { ExternalLink, FileWarning, Folder, GitBranch } from "lucide-react";
import type { Workstream } from "../../shared/types";
import { formatAbsoluteDate, formatRelativeTime } from "../utils/formatDate";

type WorkstreamCardProps = {
  workstream: Workstream;
  onOpenRepo: (repoPath: string) => void;
};

const WorkstreamCard = ({ workstream, onOpenRepo }: WorkstreamCardProps) => {
  const title =
    workstream.title ||
    (workstream.repoName && workstream.branch
      ? `${workstream.repoName} / ${workstream.branch}`
      : "Invalid status file");

  return (
    <article className={`workstream-card status-${workstream.status}`}>
      <div className="card-meta">
        <span className={`badge badge-${workstream.status}`}>
          {workstream.status.replaceAll("_", " ")}
        </span>
        <span className="badge badge-neutral">{workstream.agent}</span>
        <time title={formatAbsoluteDate(workstream.updatedAt)}>
          {formatRelativeTime(workstream.updatedAtEpoch)}
        </time>
      </div>

      <h3>{title}</h3>
      {workstream.summary ? <p className="summary">{workstream.summary}</p> : null}
      {workstream.nextRecommendedAction ? (
        <div className="next-action">
          <span>Next</span>
          <p>{workstream.nextRecommendedAction}</p>
        </div>
      ) : null}

      {workstream.isValid ? (
        <div className="repo-lines">
          <span>
            <Folder size={14} />
            {workstream.repoName}
          </span>
          <span>
            <GitBranch size={14} />
            {workstream.branch}
          </span>
        </div>
      ) : (
        <div className="invalid-details">
          <FileWarning size={16} />
          <div>
            <strong>{workstream.statusFilePath}</strong>
            {workstream.validationErrors.map((error) => (
              <span key={error}>{error}</span>
            ))}
          </div>
        </div>
      )}

      <div className="card-footer">
        <span title={workstream.repoPath}>{workstream.repoPath || workstream.statusFilePath}</span>
        <button
          disabled={!workstream.repoPath}
          type="button"
          title="Open repo in VS Code"
          onClick={() => onOpenRepo(workstream.repoPath)}
        >
          <ExternalLink size={15} />
          VS Code
        </button>
      </div>
    </article>
  );
};

export default WorkstreamCard;
