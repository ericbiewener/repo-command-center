import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CreateWorktreeModalProps = {
  repoPath: string;
  repoName: string;
  onClose: () => void;
};

const BRANCH_RE = /^[a-zA-Z0-9._-]+$/;

const CreateWorktreeModal = ({ repoPath, repoName, onClose }: CreateWorktreeModalProps) => {
  const [branch, setBranch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState<"claude" | "codex">("claude");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branchInputRef = useRef<HTMLInputElement>(null);

  const branchValid = branch.length > 0 && BRANCH_RE.test(branch);
  const branchError =
    branch.length > 0 && !BRANCH_RE.test(branch)
      ? "Branch name can only contain letters, numbers, dots, underscores, and hyphens."
      : null;

  useEffect(() => {
    branchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchValid || isPending) return;
    setIsPending(true);
    setError(null);

    const result = await window.appApi.createWorktree({
      repoPath,
      branch,
      prompt: prompt.trim() || undefined,
      agent,
    });

    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
      setIsPending(false);
    }
  };

  return createPortal(
    <>
      <motion.button
        type="button"
        className="modal-backdrop"
        aria-label="Close modal"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      />
      <motion.div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-label={`Create worktree for ${repoName}`}
        initial={{ opacity: 0, scale: 0.94, x: "-50%", y: "calc(-50% - 16px)" }}
        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
        exit={{ opacity: 0, scale: 0.94, x: "-50%", y: "calc(-50% - 16px)" }}
        transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.8 }}
      >
        <h2 className="modal-heading">New worktree — {repoName}</h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label htmlFor="branch-input">Branch name</label>
            <input
              id="branch-input"
              ref={branchInputRef}
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={isPending}
              placeholder="my-feature"
              autoComplete="off"
            />
            {branchError ? <span className="field-error">{branchError}</span> : null}
          </div>

          <div className="modal-field">
            <label htmlFor="prompt-input">Agent prompt (optional)</label>
            <textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder="Describe what the agent should do…"
            />
          </div>

          <div className="modal-field modal-field-row">
            <span>Agent</span>
            <label>
              <input
                type="radio"
                name="agent"
                value="claude"
                checked={agent === "claude"}
                onChange={() => setAgent("claude")}
                disabled={isPending}
              />
              Claude
            </label>
            <label>
              <input
                type="radio"
                name="agent"
                value="codex"
                checked={agent === "codex"}
                onChange={() => setAgent("codex")}
                disabled={isPending}
              />
              Codex
            </label>
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={!branchValid || isPending}>
              {isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </motion.div>
    </>,
    document.body,
  );
};

export default CreateWorktreeModal;
