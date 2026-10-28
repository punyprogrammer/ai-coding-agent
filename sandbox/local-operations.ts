import { execSync } from "node:child_process";
import { BashOperations } from "../types/types";

export function createLocalOperations(cwd: string): BashOperations {
  return {
    exec: async (command) => {
      try {
        const stdout = execSync(command, {
          cwd,
          encoding: "utf-8",
          timeout: 30_000,
        });
        return { stdout, exitCode: 0 };
      } catch (e: any) {
        return {
          stdout: e.stdout || e.stderr || e.message || "",
          exitCode: e.status ?? 1,
        };
      }
    },
  };
}
