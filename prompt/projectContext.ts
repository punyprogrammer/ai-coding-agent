import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
export function getProjectContext(workingDirectory: string) {
  const agentsMdPath = resolve(workingDirectory, "AGENTS.md");
  const projectContext = readFileSync(agentsMdPath, "utf-8");
  if (existsSync(agentsMdPath)) {
    return projectContext;
  }
  return "";
}
