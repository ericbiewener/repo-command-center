import type { EmptyStateKind } from "../utils/getEmptyStateKind";

type EmptyStateProps = {
  hiddenDoneCount: number;
  kind: EmptyStateKind;
  statusRoot: string;
};

const formatDoneFileCount = (count: number) =>
  `${count} completed status ${count === 1 ? "file is" : "files are"} hidden.`;

const EmptyState = ({ hiddenDoneCount, kind, statusRoot }: EmptyStateProps) => {
  const title =
    kind === "no-files"
      ? "No AI workstream status files found."
      : kind === "done-hidden"
        ? "No active AI workstreams."
        : "No AI workstreams match the current filters.";

  return (
    <section className="empty-state">
      <h2>{title}</h2>
      {kind === "no-files" ? (
        <>
          <p>Expected files under:</p>
          <code>{`${statusRoot}/repos/**/*.json`}</code>
          <p>
            Use <code>ai-work-status update</code> from inside a Git repo to create one.
          </p>
        </>
      ) : kind === "done-hidden" ? (
        <p>{formatDoneFileCount(hiddenDoneCount)} Enable Done to view completed workstreams.</p>
      ) : (
        <p>Adjust the search text or Done filter to widen the list.</p>
      )}
    </section>
  );
};

export default EmptyState;
