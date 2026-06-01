import type { Workstream, WorkstreamStatus } from "../../shared/types";
import WorkstreamCard from "./WorkstreamCard";

type StatusGroupProps = {
  label: string;
  status: WorkstreamStatus;
  workstreams: Workstream[];
  onOpenRepo: (repoPath: string) => void;
};

const StatusGroup = ({ label, status, workstreams, onOpenRepo }: StatusGroupProps) => (
  <section className="status-section">
    <div className="status-heading">
      <h2>{label}</h2>
      <span>{workstreams.length}</span>
    </div>
    <div className="card-list">
      {workstreams.map((workstream) => (
        <WorkstreamCard
          key={`${status}-${workstream.statusFilePath}`}
          workstream={workstream}
          onOpenRepo={onOpenRepo}
        />
      ))}
    </div>
  </section>
);

export default StatusGroup;
