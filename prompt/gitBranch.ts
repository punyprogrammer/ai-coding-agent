import { execSync } from "node:child_process";

export function readGitBranch(directory: string): string | undefined {
  try {
    const branch = execSync("git branch --show-current", {
      cwd: directory,
      encoding: "utf-8",
      timeout: 5_000,
    }).trim();
    return branch || undefined;
  } catch {
    return undefined;
  }
}
