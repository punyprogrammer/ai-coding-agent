import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { file, number, z } from "zod";
import { resolve } from "node:path";
import { read, readFileSync } from "node:fs";
import { exec, execSync } from "node:child_process";
const SAFE_PREFIXES = [
  "ls",
  "cat",
  "echo",
  "pwd",
  "which",
  "find",
  "head",
  "tail",
  "wc",
  "git log",
  "git status",
  "git diff",
];
const isSafePrefix = (command: string) =>
  SAFE_PREFIXES.some((prefix) => command.trim().startsWith(prefix));
const cwd = resolve(process.argv[2] || process.cwd());

const readTool = tool({
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
    const content = readFileSync(absPath, "utf-8");
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
const grepTool = tool({
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
    glob: z
      .string()
      .optional()
      .describe("Glob pattern to match files,e.g '*.ts' "),
    path: z
      .string()
      .optional()
      .describe("Directory to search (default : current working directory'"),
  }),
  execute: async ({ pattern, path: searchPath, glob: globFilter }) => {
    const dir = resolve(cwd, searchPath || ".");
    const escapedPattern = pattern.replace(/'/g, `'\\''`);
    const escapedGlob = (globFilter || "*").replace(/'/g, `'\\''`);
    const cmd = `grep -rn --exclude-dir=node_modules --exclude-dir=.git --include='${escapedGlob}' -E '${escapedPattern}' '${dir}' 2>/dev/null`;

    try {
      const stdout = execSync(cmd, { encoding: "utf-8", timeout: 10_000 });
      const lines = stdout.trim().split("\\n").filter(Boolean);

      const MAX_MATCHES = 50;
      const truncated = lines.length > MAX_MATCHES;
      const result = truncated ? lines.slice(0, MAX_MATCHES) : lines;

      return truncated
        ? result.join("\\n") +
            `\\n... (${lines.length} total, showing first ${MAX_MATCHES})`
        : result.join("\\n") || "No matches found.";
    } catch (error: any) {
      const stdout = String(error?.stdout || "").trim();
      if (stdout) {
        const lines = stdout.split("\\n").filter(Boolean);
        const MAX_MATCHES = 50;
        const truncated = lines.length > MAX_MATCHES;
        const result = truncated ? lines.slice(0, MAX_MATCHES) : lines;
        return truncated
          ? result.join("\\n") +
              `\\n... (${lines.length} total, showing first ${MAX_MATCHES})`
          : result.join("\\n");
      }
      return "No matches found.";
    }
  },
});
const bashTool = tool({
  description: `Execute a shell command in the working directory.
 
WHEN TO USE: running build commands, installing packages, running tests,
  git operations, directory listings.
 
WHEN NOT TO USE: reading file contents (use read instead).
  Searching for patterns (use grep instead).
 
DO NOT USE FOR: reading files (use read), searching code (use grep).
 
USAGE: command is a single shell string. Commands not in the safe-prefix
  allowlist are blocked and return a clear error message.
 
EXAMPLES:
  - List files: command "ls -la"
  - Check git status: command "git status"
  - Run a test suite: command "npm test"
  `,
  inputSchema: z.object({
    command: z.string().describe("Shell command to execute"),
  }),
  execute: async ({ command }) => {
    if (!isSafePrefix(command)) {
      return `Blocked command : ${command} requires approval.Only safe commands (${SAFE_PREFIXES.join(",")}) are allowed.`;
    }
    try {
      const stdout = execSync(command, { encoding: "utf-8", timeout: 30_000 });
      return stdout.trim();
    } catch (e: any) {
      return `Exit ${e.status ?? 1}: ${e.stdout || e.stderr || e.message || ""}`;
    }
  },
});
const agent = new ToolLoopAgent({
  model: "anthropic/claude-haiku-4.5",
  instructions: `You are a coding agent .\nWorking directory: ${cwd}`,
  tools: { readTool, grepTool, bashTool },
  stopWhen: stepCountIs(10),
});
const prompt = process.argv.slice(3).join(" ") || "Hello";
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(steps.map((step) => step.toolCalls).join("\n"));
