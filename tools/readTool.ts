import { tool } from "ai";
import z from "zod";
import { Sandbox } from "../sandbox/sandbox";

function createReadTool(cwd: string, sandbox?: Sandbox) {
  if (!sandbox) {
    throw new Error("Sandbox is required");
  }
  // Lesson 1: Read tool
  // Reads a file from the sandbox and returns its contents as numbered lines.
  // Primary utility: lets the agent inspect any file by path, with optional
  // offset and line-limit controls to avoid loading large files in full.
  return tool({
    description: `Read a file from the project. Returns numbered lines.
         
        WHEN TO USE: viewing file contents, checking configurations, reading source code,
          examining specific lines with offset/limit.
         
        WHEN NOT TO USE: searching for patterns across files (use grep instead).
          Running commands (use bash instead).
         
        DO NOT USE FOR: searching code (use grep), executing commands (use bash),
          modifying files (use edit or write).
         
        USAGE: path is relative to working directory. offset and limit are optional.
          Output is capped at 500 lines.
          `,
    inputSchema: z.object({
      path: z.string().describe("File path relative to the working directory"),
      offset: z.number().optional().describe("Start line (1-indexed)"),
      limit: z.number().optional().describe("Max lines to return "),
    }),
    execute: async ({ path, offset, limit }) => {
      try {
        const content = await sandbox.readFile(path);
        let lines = content.split("\n");
        const start = offset && offset > 0 ? offset - 1 : 0;
        lines = lines.slice(start, start + (limit && limit > 0 ? limit : 500));
        return lines
          .map((line, index) => `${start + index + 1}: ${line}`)
          .join("\n");
      } catch (error) {
        if (error instanceof Error) {
          return error.message;
        }
        throw error;
      }
    },
  });
}
export default createReadTool;
