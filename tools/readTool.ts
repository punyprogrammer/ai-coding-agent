import { tool } from "ai";
import { resolve } from "node:path";
import { readFileSync } from "fs";

import z from "zod";
import { Sandbox } from "../sandbox/sandbox";

function createReadTool(cwd: string, sandbox?: Sandbox) {
  if (!sandbox) {
    throw new Error("Sandbox is required");
  }
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
    execute: async ({ path: filePath, offset, limit }) => {
      const absPath = resolve(cwd, filePath);
      const content = await sandbox.readFile(absPath);
      let lines = content.split("\n");
      if (offset) {
        lines = lines.slice(offset - 1);
      }
      if (limit) {
        lines = lines.slice(0, limit);
      }
      const MAX_LINES = 500;
      const truncated = lines.length > MAX_LINES;
      lines = truncated ? lines.slice(0, MAX_LINES) : lines;
      const numbered = lines.map(
        (line, index) => `${(offset || 1) + index}: ${line}`,
      );
      return truncated
        ? numbered.join("\n") + `\n... truncated at ${MAX_LINES} lines`
        : numbered.join("\n");
    },
  });
}
export default createReadTool;
