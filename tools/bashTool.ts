import { tool } from "ai";
import { z } from "zod";
import { BashOperations } from "../types/types";

function createBashTool(
  operations: BashOperations,
  needsApproval: (input: { command: string }) => boolean,
) {
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
      if (needsApproval({ command })) {
        return `Blocked: "${command}" requires approval.`;
      }
      const { stdout } = await operations.exec(command);
      return stdout || "(no output)";
    },
  });
}
export default createBashTool;
