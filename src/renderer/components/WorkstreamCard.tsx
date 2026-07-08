import { AlertCircle, FileWarning, GitMerge, GitPullRequest } from "lucide-react";
import { motion } from "motion/react";
import type { ResolvedCustomAction } from "../../shared/settings";
import type { Workstream } from "../../shared/types";

type WorkstreamCardProps = {
  workstream: Workstream;
  customActions: ResolvedCustomAction[];
  isSelected: boolean;
  showRepo?: boolean;
  isPending?: boolean;
  onAction: (workstream: Workstream, action: () => Promise<unknown>) => Promise<void>;
};

const CI_COLORS: Record<string, string> = {
  passing: "#2f8f68",
  failing: "#d35b3f",
  pending: "#c89a2a",
  error: "#8a8478",
};

const WorkstreamCard = ({
  workstream,
  customActions,
  isSelected,
  showRepo = false,
  isPending = false,
  onAction,
}: WorkstreamCardProps) => {
  const { gitStatus, prInfo } = workstream;
  const hasPr = prInfo !== null && !("fetchError" in prInfo);
  const prFetchError = prInfo !== null && "fetchError" in prInfo;

  return (
    <motion.tr
      className={`workstream-row status-row-${workstream.status}${isSelected ? " selected" : ""}`}
      data-selected={isSelected ? "true" : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: isPending ? 0.7 : 1 }}
      transition={{ duration: 0.2 }}
      onClick={() => {
        isPending
          ? undefined
          : void onAction(workstream, () =>
              window.appApi.executeAction(workstream.repoPath, workstream.branch),
            );
      }}
    >
      {showRepo ? (
        <td className="col-repo">
          <span className="repo-name">{workstream.repoName || "Unknown"}</span>
        </td>
      ) : null}
      <td className="col-branch">
        <span className="branch-name">{workstream.branch}</span>
        {!workstream.isValid ? (
          <span className="row-invalid" title={workstream.validationErrors.join("; ")}>
            <FileWarning size={12} />
          </span>
        ) : null}
      </td>

      <td className="col-title">{workstream.title ?? null}</td>

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
            onClick={(e) => {
              e.stopPropagation();
              void window.appApi.openExternal(prInfo.url);
            }}
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

      {customActions.length > 0 ? (
        <td className="col-actions">
          <div className="actions-cell">
            {customActions.map((action, i) => (
              <button
                key={action.title}
                type="button"
                title={action.title}
                className="action-btn"
                style={action.background ? { background: action.background } : undefined}
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  isPending
                    ? undefined
                    : void onAction(workstream, () =>
                        window.appApi.executeCustomAction(
                          i,
                          workstream.repoPath,
                          workstream.branch,
                        ),
                      );
                }}
              >
                {action.iconDataUri ? (
                  <img src={action.iconDataUri} alt={action.title} className="action-icon" />
                ) : (
                  action.title
                )}
              </button>
            ))}
          </div>
        </td>
      ) : null}
    </motion.tr>
  );
};

export default WorkstreamCard;
