import { tool } from "ai";
import z from "zod";
import { Sandbox } from "../sandbox/sandbox";

function createGrepTool(cwd: string, sandbox?: Sandbox) {
  if (!sandbox) {
    throw new Error("Sandbox is required");
  }
  // Lesson 2: Grep tool
  // Searches file contents across the project using a regex pattern.
  // Primary utility: efficiently locates matching lines in many files at once
  // without reading each file individually; supports glob filtering to narrow
  // the search to specific file types and caps results at 50 matches to keep
  // output manageable.
  return tool({
    description: `Search file contents using regex. Returns matching lines with file paths.
         
        WHEN TO USE: finding patterns across multiple files, locating function definitions,
          searching for imports, finding TODOs or error messages.
         
        WHEN NOT TO USE: reading a known file (use read instead).
          Running commands (use bash instead).
         
        DO NOT USE FOR: reading files (use read), listing directories (use bash),
          modifying files (use edit).
         
        USAGE: pattern is a regex string. glob filters by file extension.
          Results are capped at 50 matches.
         
        EXAMPLES:
          - Find all TODO comments: pattern "TODO" glob "*.ts"
          - Find function definitions: pattern "function \\w+" glob "*.ts"
          - Find imports of a package: pattern "from 'express'" glob "*.ts"`,
    inputSchema: z.object({
      pattern: z.string().describe("Regex pattern to search for "),
      glob: z.string().optional().describe("Glob pattern to match files,e.g '*.ts' "),
      path: z.string().optional().describe("Directory to search (default : current working directory'"),
    }),
    execute: async ({ pattern, glob, path }) => {
      const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
      const globPattern = glob || "*";
      const searchPath = path || ".";
      const { stdout, exitCode } = await sandbox.exec(
        `grep -rn --exclude-dir=node_modules --exclude-dir=.git --include=${quote(globPattern)} -E ${quote(pattern)} ${quote(searchPath)}`,
      );
      const lines = stdout.trim().split("\n").filter(Boolean);
      if (lines.length === 0) {
        return exitCode === 0 ? "No matches found." : stdout.trim() || "No matches found.";
      }
      const MAX_MATCHES = 50;
      const shown = lines.slice(0, MAX_MATCHES);
      return lines.length > MAX_MATCHES
        ? shown.join("\n") + `\n... (${lines.length} total, showing first ${MAX_MATCHES})`
        : shown.join("\n");
    },
  });
}
export default createGrepTool;
