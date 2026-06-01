import { AlertTriangle } from "lucide-react";
import type { Workstream } from "../../shared/types";

type ErrorPanelProps = {
  message?: string | null;
  invalidWorkstreams: Workstream[];
};

const ErrorPanel = ({ message, invalidWorkstreams }: ErrorPanelProps) =>
  message || invalidWorkstreams.length ? (
    <section className="error-panel">
      <AlertTriangle size={18} />
      <div>
        {message ? <p>{message}</p> : null}
        {invalidWorkstreams.length ? (
          <p>
            {invalidWorkstreams.length} status file
            {invalidWorkstreams.length === 1 ? " needs" : "s need"} attention.
          </p>
        ) : null}
      </div>
    </section>
  ) : null;

export default ErrorPanel;
