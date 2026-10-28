import { tool } from "ai";
import z from "zod";
import { Sandbox } from "../sandbox/sandbox";

function createBashTool(cwd: string, sandbox?: Sandbox) {
  if (!sandbox) {
    throw new Error("Sandbox is required");
  }
  // Lesson 3: Bash tool
  // Executes an arbitrary shell command inside the sandbox environment.
  // Primary utility: enables any action that read/grep cannot cover — running
  // builds, tests, installs, git operations, file mutations, and directory
  // listings — while surfacing both stdout and non-zero exit codes to the agent.
  return tool({
    description: `Execute a shell command in the working directory.
     
    WHEN TO USE: running build commands, installing packages, running tests,
      git operations, directory listings.
     
    WHEN NOT TO USE: reading file contents (use read instead).
      Searching for patterns (use grep instead).
     
    DO NOT USE FOR: reading files (use read), searching code (use grep).
     
    USAGE: command is a single shell string. The active approval mode decides
      which commands run immediately. Commands that still need approval are
      blocked and return a clear error message.
     
    EXAMPLES:
      - List files: command "ls -la"
      - Check git status: command "git status"
      - Run a test suite: command "npm test"
      `,
    inputSchema: z.object({
      command: z.string().describe("Shell command to execute"),
    }),
    execute: async ({ command }) => {
      try {
        const { stdout, exitCode } = await sandbox.exec(command);
        if (exitCode !== 0) {
          return stdout || `Command failed with exit code ${exitCode}`;
        }
        return stdout || "(no output)";
      } catch (error) {
        if (error instanceof Error) {
          return error.message;
        }
        throw error;
      }
    },
  });
}
export default createBashTool;
