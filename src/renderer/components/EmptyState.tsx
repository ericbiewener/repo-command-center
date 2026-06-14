type EmptyStateProps = {
  statusRoot: string;
};

const EmptyState = ({ statusRoot }: EmptyStateProps) => (
  <section className="empty-state">
    <h2>No AI workstream status files found.</h2>
    <p>Expected files under:</p>
    <code>{`${statusRoot}/repos/**/*.json`}</code>
    <p>
      Use <code>ai-work-status update</code> from inside a Git repo to create one.
    </p>
  </section>
);

export default EmptyState;
