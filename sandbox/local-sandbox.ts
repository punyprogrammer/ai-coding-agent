import { Sandbox } from "./sandbox";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

export function createLocalSandbox(workingDirectory: string): Sandbox {
  return {
    type: "local",
    workingDirectory,
    readFile: async (path) => {
      return readFileSync(resolve(workingDirectory, path), "utf-8");
    },
    exec: async (command) => {
      try {
        const stdout = execSync(command, {
          cwd: workingDirectory,
          encoding: "utf-8",
          timeout: 30_000,
        });
        return { stdout, exitCode: 0 };
      } catch (error: any) {
        return {
          stdout: error.stdout || error.stderr || error.message || "",
          exitCode: error.status || 1,
        };
      }
    },
    stop: async () => {},
    expiresAt: undefined,
    snapshot: async () => ({ snapshotId: "" }),
  };
}
