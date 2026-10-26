import { SAFE_PREFIXES } from "./constants";

/**
 * Policy for which shell commands may run without a person approving them.
 *
 * `createApproval` returns a predicate that is `true` when `command` still
 * needs approval, and `false` when it may run immediately. The check compares
 * the start of the trimmed command string to each prefix (`"ls"` matches
 * `"ls -la"` and `"lsof"`).
 *
 * - `interactive` — a person can approve commands. A command runs immediately
 *   when it starts with an entry in {@link SAFE_PREFIXES} (`ls`, `cat`,
 *   `git status`, and the rest of that list). Every other command needs
 *   approval.
 * - `delegated` — trust is limited to the caller's `trust` prefixes. A
 *   command runs immediately when it starts with one of those prefixes.
 *   Every other command needs approval. An empty `trust` list requires
 *   approval for every command.
 * - `background` — nobody is available to approve. The predicate is always
 *   `false`, so every command runs without an approval check.
 *
 * @example
 * createApproval({ mode: "interactive" })
 * createApproval({ mode: "delegated", trust: ["npm test", "git status"] })
 * createApproval({ mode: "background" })
 */
export type ApprovalConfig =
  | { mode: "interactive" }
  | { mode: "background" }
  | { mode: "delegated"; trust: string[] };

function createApproval(config: ApprovalConfig) {
  return ({ command }: { command: string }) => {
    if (config.mode === "background") {
      return false;
    }
    if (config.mode === "delegated") {
      return !config.trust.some((p) => command.trim().startsWith(p));
    }
    return !SAFE_PREFIXES.some((p) => command.trim().startsWith(p));
  };
}
export default createApproval;
