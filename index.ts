import { ToolLoopAgent, stepCountIs } from "ai";

import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { BashOperations } from "./types/types";
import createReadTool from "./tools/readTool";
import createGrepTool from "./tools/grepTool";
import createBashTool from "./tools/bashTool";
import { buildSystemPrompt } from "./prompt/systemPrompt";
import { readGitBranch } from "./prompt/gitBranch";
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
  instructions: buildSystemPrompt({
    workingDirectory: cwd,
    toolNames: ["read", "grep", "bash"],
    sandboxType: "local",
    gitBranch: readGitBranch(cwd),
  }),
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
