import { AlertCircle, FileWarning, GitMerge, GitPullRequest } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { ResolvedCustomAction } from "../../shared/settings";
import type { Workstream } from "../../shared/types";
import vscodeLogo from "../vscode.svg";

type WorkstreamCardProps = {
  workstream: Workstream;
  onOpenRepo: (repoPath: string) => void;
  customActions: ResolvedCustomAction[];
  isSelected: boolean;
};

const CI_COLORS: Record<string, string> = {
  passing: "#2f8f68",
  failing: "#d35b3f",
  pending: "#c89a2a",
  error: "#8a8478",
};

const WorkstreamCard = ({
  workstream,
  onOpenRepo,
  customActions,
  isSelected,
}: WorkstreamCardProps) => {
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
    <motion.tr
      className={`workstream-row status-row-${workstream.status}${isSelected ? " selected" : ""}`}
      data-selected={isSelected ? "true" : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <td className="col-branch">
        <span className="branch-name">{workstream.branch}</span>
        {!workstream.isValid ? (
          <span className="row-invalid" title={workstream.validationErrors.join("; ")}>
            <FileWarning size={12} />
          </span>
        ) : null}
      </td>

      <td className="col-title">{workstream.title ?? null}</td>

      <td className="col-status">
        <span className={`status-pill status-pill-${workstream.status}`}>
          {workstream.rawStatus || workstream.status}
        </span>
      </td>

      <td className="col-local-changes">
        {gitStatus !== null &&
        (gitStatus.uncommittedCount > 0 ||
          (gitStatus.unpushedCount !== null && gitStatus.unpushedCount > 0)) ? (
          <span
            role="img"
            className="local-changes-dot"
            aria-label="Has local changes"
            title={[
              gitStatus.uncommittedCount > 0 ? `${gitStatus.uncommittedCount} uncommitted` : null,
              gitStatus.unpushedCount !== null && gitStatus.unpushedCount > 0
                ? `${gitStatus.unpushedCount} unpushed`
                : null,
            ]
              .filter(Boolean)
              .join(", ")}
          />
        ) : null}
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
      <td className="col-description">
        {workstream.summary ? (
          <span className="description-text" title={workstream.summary}>
            {workstream.summary}
          </span>
        ) : null}
      </td>
    </motion.tr>
  );
};

export default WorkstreamCard;
