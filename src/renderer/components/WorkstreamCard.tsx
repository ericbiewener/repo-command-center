import { AlertCircle, FileEdit, FileWarning, GitMerge, GitPullRequest, Upload } from "lucide-react";
import { useState } from "react";
import type { ResolvedCustomAction } from "../../shared/settings";
import type { PrInfo, Workstream } from "../../shared/types";
import vscodeLogo from "../vscode.svg";

type WorkstreamCardProps = {
  workstream: Workstream;
  onOpenRepo: (repoPath: string) => void;
  customActions: ResolvedCustomAction[];
};

const CI_COLORS: Record<string, string> = {
  passing: "#2f8f68",
  failing: "#d35b3f",
  pending: "#c89a2a",
  error: "#8a8478",
};

const CiBadge = ({ ciStatus }: { ciStatus: string }) => (
  <span
    role="img"
    className="ci-dot"
    style={{ background: CI_COLORS[ciStatus] ?? CI_COLORS.error }}
    aria-label={`CI: ${ciStatus}`}
    title={`CI: ${ciStatus}`}
  />
);

const PrSection = ({ prInfo }: { prInfo: PrInfo | null }) => {
  if (!prInfo) return null;
  if ("fetchError" in prInfo) {
    return (
      <div className="card-pr card-pr-error">
        <AlertCircle size={13} />
        <span>PR fetch failed</span>
      </div>
    );
  }
  return (
    <div className={`card-pr${prInfo.merged ? " card-pr-merged" : ""}`}>
      {prInfo.merged ? <GitMerge size={13} /> : <GitPullRequest size={13} />}
      <button
        type="button"
        className="pr-link"
        onClick={() => void window.appApi.openExternal(prInfo.url)}
        title={`Open PR #${prInfo.number}${prInfo.merged ? " (merged)" : ""}`}
      >
        #{prInfo.number}
      </button>
      {!prInfo.merged && <CiBadge ciStatus={prInfo.ciStatus} />}
    </div>
  );
};

const WorkstreamCard = ({ workstream, onOpenRepo, customActions }: WorkstreamCardProps) => {
  const [executingActions, setExecutingActions] = useState<Record<number, boolean>>(
    Object.create(null),
  );

  const title =
    workstream.title ||
    (workstream.repoName && workstream.branch
      ? `${workstream.repoName} / ${workstream.branch}`
      : "Invalid status file");

  const { gitStatus } = workstream;

  const handleCustomAction = async (index: number) => {
    setExecutingActions((prev) => ({ ...prev, [index]: true }));
    await window.appApi.executeCustomAction(index, workstream.repoPath);
    setExecutingActions((prev) => ({ ...prev, [index]: false }));
  };

  return (
    <article className={`workstream-card status-${workstream.status}`}>
      <div className="card-title">
        <h3>{title}</h3>
        <div className="card-actions">
          {gitStatus ? (
            <>
              <span
                role="img"
                title="Uncommitted changes"
                aria-label={`${gitStatus.uncommittedCount} uncommitted files`}
              >
                <FileEdit size={12} />
                <span>{gitStatus.uncommittedCount}</span>
              </span>
              <span
                role="img"
                title="Unpushed commits"
                aria-label={
                  gitStatus.unpushedCount === null
                    ? "No upstream branch"
                    : `${gitStatus.unpushedCount} unpushed commits`
                }
              >
                <Upload size={12} />
                <span>{gitStatus.unpushedCount === null ? "—" : gitStatus.unpushedCount}</span>
              </span>
            </>
          ) : null}
          {customActions.map((action, i) => (
            <button
              key={action.title}
              type="button"
              title={action.title}
              disabled={executingActions[i] === true}
              onClick={() => void handleCustomAction(i)}
            >
              {action.iconDataUri ? (
                <img src={action.iconDataUri} alt={action.title} />
              ) : (
                action.title
              )}
            </button>
          ))}
          <button
            disabled={!workstream.repoPath}
            type="button"
            title="Open repo in VS Code"
            onClick={() => onOpenRepo(workstream.repoPath)}
          >
            <img src={vscodeLogo} alt="VS Code" className="vscode-icon" />
          </button>
        </div>
      </div>

      {workstream.summary ? <p className="summary">{workstream.summary}</p> : null}

      <PrSection prInfo={workstream.prInfo} />

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
