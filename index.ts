import { ToolLoopAgent, stepCountIs } from "ai";

import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { BashOperations } from "./types/types";
import createReadTool from "./tools/readTool";
import createGrepTool from "./tools/grepTool";
import createBashTool from "./tools/bashTool";

import createApproval from "./config/approval";

const cwd = resolve(process.argv[2] || process.cwd());

const localOps: BashOperations = {
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

const agent = new ToolLoopAgent({
  model: "anthropic/claude-haiku-4.5",
  instructions: `You are a coding agent .\nWorking directory: ${cwd}
  # Agency
- USE your tools. Read files, search code, run commands, then answer.
- Do NOT explain what you WOULD do. Actually do it.
- Prefer grep for searching, read for viewing files.
- Use bash only for commands that aren't covered by other tools.
 
# Guardrails
- Prefer simple, minimal changes
- Search before creating, and reuse existing patterns
- No new dependencies without asking
  `,
  tools: {
    read: createReadTool(cwd),
    grep: createGrepTool(cwd),
    bash: createBashTool(localOps, createApproval({ mode: "background" })),
  },

  stopWhen: stepCountIs(10),
});
const prompt = process.argv.slice(3).join(" ") || "Hello";
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(steps.map((step) => step.toolCalls).join("\n"));
