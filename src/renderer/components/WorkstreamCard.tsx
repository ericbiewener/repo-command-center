import { FileWarning } from "lucide-react";
import type { Workstream } from "../../shared/types";
import vscodeLogo from "../vscode.svg";

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
      <div className="card-title">
        <h3>{title}</h3>
        <button
          disabled={!workstream.repoPath}
          type="button"
          title="Open repo in VS Code"
          onClick={() => onOpenRepo(workstream.repoPath)}
        >
          <img src={vscodeLogo} alt="VS Code" className="vscode-icon" />
        </button>
      </div>

      {workstream.summary ? <p className="summary">{workstream.summary}</p> : null}

      {!workstream.isValid && (
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
    </article>
  );
};

export default WorkstreamCard;
