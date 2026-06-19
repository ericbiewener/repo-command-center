import { AlertCircle, FileEdit, FileWarning, GitMerge, GitPullRequest, Upload } from "lucide-react";
import { useState } from "react";
import type { ResolvedCustomAction } from "../../shared/settings";
import type { Workstream } from "../../shared/types";
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

const WorkstreamCard = ({ workstream, onOpenRepo, customActions }: WorkstreamCardProps) => {
  const [executingActions, setExecutingActions] = useState<Record<number, boolean>>(
    Object.create(null),
  );

  const { gitStatus, prInfo } = workstream;
  const hasPr = prInfo !== null && !("fetchError" in prInfo);
  const prFetchError = prInfo !== null && "fetchError" in prInfo;

  const handleCustomAction = async (index: number) => {
    setExecutingActions((prev) => ({ ...prev, [index]: true }));
    await window.appApi.executeCustomAction(index, workstream.repoPath);
    setExecutingActions((prev) => ({ ...prev, [index]: false }));
  };

  return (
    <tr className={`workstream-row status-row-${workstream.status}`}>
      <td className="col-branch">
        <div className="branch-cell">
          <span className="branch-name">{workstream.branch}</span>
          {workstream.title ? <span className="row-title">{workstream.title}</span> : null}
          {workstream.summary ? <span className="row-summary">{workstream.summary}</span> : null}
          {!workstream.isValid ? (
            <span className="row-invalid" title={workstream.validationErrors.join("; ")}>
              <FileWarning size={12} />
            </span>
          ) : null}
        </div>
      </td>

      <td className="col-status">
        <span className={`status-pill status-pill-${workstream.status}`}>
          {workstream.rawStatus || workstream.status}
        </span>
      </td>

      <td className="col-uncommitted">
        {gitStatus !== null ? (
          <span className="git-count" title={`${gitStatus.uncommittedCount} uncommitted files`}>
            <FileEdit size={11} />
            {gitStatus.uncommittedCount}
          </span>
        ) : (
          "—"
        )}
      </td>

      <td className="col-unpushed">
        {gitStatus !== null ? (
          gitStatus.unpushedCount === null ? (
            <span title="No upstream branch">—</span>
          ) : (
            <span className="git-count" title={`${gitStatus.unpushedCount} unpushed commits`}>
              <Upload size={11} />
              {gitStatus.unpushedCount}
            </span>
          )
        ) : (
          "—"
        )}
      </td>

      <td className="col-pr">
        {prFetchError ? (
          <span className="pr-fetch-error" title="PR fetch failed">
            <AlertCircle size={12} />
          </span>
        ) : hasPr ? (
          <button
            type="button"
            className={`pr-link${prInfo.merged ? " pr-merged" : ""}`}
            onClick={() => void window.appApi.openExternal(prInfo.url)}
            title={`Open PR #${prInfo.number}${prInfo.merged ? " (merged)" : ""}`}
          >
            {prInfo.merged ? <GitMerge size={11} /> : <GitPullRequest size={11} />}#{prInfo.number}
          </button>
        ) : null}
      </td>

      <td className="col-ci">
        {hasPr && !prInfo.merged ? (
          <span
            role="img"
            className="ci-dot"
            style={{ background: CI_COLORS[prInfo.ciStatus] ?? CI_COLORS.error }}
            aria-label={`CI: ${prInfo.ciStatus}`}
            title={`CI: ${prInfo.ciStatus}`}
          />
        ) : null}
      </td>

      <td className="col-actions">
        <div className="actions-cell">
          {customActions.map((action, i) => (
            <button
              key={action.title}
              type="button"
              title={action.title}
              className="action-btn"
              disabled={executingActions[i] === true}
              onClick={() => void handleCustomAction(i)}
            >
              {action.iconDataUri ? (
                <img src={action.iconDataUri} alt={action.title} className="action-icon" />
              ) : (
                action.title
              )}
            </button>
          ))}
          <button
            type="button"
            className="action-btn"
            disabled={!workstream.repoPath}
            title="Open repo in VS Code"
            onClick={() => onOpenRepo(workstream.repoPath)}
          >
            <img src={vscodeLogo} alt="VS Code" className="vscode-icon" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default WorkstreamCard;
