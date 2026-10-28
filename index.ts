import { ToolLoopAgent, pruneMessages, stepCountIs } from "ai";

import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { BashOperations } from "./types/types";
import createReadTool from "./tools/readTool";
import createGrepTool from "./tools/grepTool";
import createBashTool from "./tools/bashTool";
import { buildSystemPrompt } from "./prompt/systemPrompt";
import { readGitBranch } from "./prompt/gitBranch";
import createApproval from "./config/approval";
import { getProjectContext } from "./prompt/projectContext";
import { createLocalSandbox } from "./sandbox/local-sandbox";
import { createJustBashSandbox } from "./sandbox/just-bash-sandbox";
import { SandboxLifeCycle } from "./sandbox/sandbox";
import { addCacheControl } from "./helpers/cache-control";

const cwd = resolve(process.argv[2] || process.cwd());
const sandboxType = process.env.SANDBOX || "local";
const sandbox =
  sandboxType === "just-bash"
    ? await createJustBashSandbox(cwd)
    : createLocalSandbox(cwd);
const lifeCycle: SandboxLifeCycle = {};
await lifeCycle.afterStart?.(sandbox);
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
    projectContext: getProjectContext(cwd),
  }),
  tools: {
    read: createReadTool(cwd, sandbox),
    grep: createGrepTool(cwd, sandbox),
    bash: createBashTool(
      localOps,
      createApproval({ mode: "background" }),
      sandbox,
    ),
  },
  onStepFinish: ({ usage, stepNumber, toolCalls }) => {
    const tools =
      toolCalls.map((call) => call.toolName).join(", ") || "(no tool)";
    const { cacheReadTokens, cacheWriteTokens } = usage.inputTokenDetails;
    console.error(
      `Step ${stepNumber}: ${tools} | ${usage.inputTokens} input, ${usage.outputTokens} output, cache read ${cacheReadTokens ?? 0}, cache write ${cacheWriteTokens ?? 0}`,
    );
  },

  stopWhen: stepCountIs(100),
  prepareCall: async (options) => {
    const pruned = options.messages
      ? pruneMessages({
          messages: options.messages,
          toolCalls: "before-last-3-messages",
        })
      : undefined;

    return {
      ...options,
      messages: pruned ? addCacheControl(pruned) : undefined,
    };
  },
  prepareStep: async ({ messages }) => ({
    messages: addCacheControl(
      pruneMessages({
        messages,
        toolCalls: "before-last-3-messages",
      }),
    ),
  }),
});
const prompt = process.argv.slice(3).join(" ") || "Hello";
try {
  const { text, steps } = await agent.generate({ prompt });
  console.log(text);
  console.log(steps.map((step) => step.toolCalls).join("\n"));
} finally {
  await lifeCycle.beforeStop?.(sandbox);
  await sandbox.stop();
}
