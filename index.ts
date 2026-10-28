import { ToolLoopAgent, pruneMessages, stepCountIs } from "ai";

import { resolve } from "node:path";
import createReadTool from "./tools/readTool";
import createGrepTool from "./tools/grepTool";
import createBashTool from "./tools/bashTool";
import { buildSystemPrompt } from "./prompt/systemPrompt";
import { readGitBranch } from "./prompt/gitBranch";
import { getProjectContext } from "./prompt/projectContext";
import { createLocalSandbox } from "./sandbox/local-sandbox";
import { createJustBashSandbox } from "./sandbox/just-bash-sandbox";
import { SandboxLifeCycle } from "./sandbox/sandbox";
import { addCacheControl } from "./helpers/cache-control";
import { createTaskTool } from "./tools/tasktool";

const workingDir = resolve(process.argv[2] || process.cwd());
const sandboxType = process.env.SANDBOX || "local";
const sandbox =
  sandboxType === "just-bash"
    ? await createJustBashSandbox(workingDir)
    : createLocalSandbox(workingDir);
const lifeCycle: SandboxLifeCycle = {};
await lifeCycle.afterStart?.(sandbox);
const tools = {
  read: createReadTool(workingDir, sandbox),
  grep: createGrepTool(workingDir, sandbox),
  bash: createBashTool(workingDir, sandbox),
};
const toolsWithTask = {
  ...tools,
  task: createTaskTool(sandbox, tools),
};
const agent = new ToolLoopAgent({
  model: "anthropic/claude-haiku-4.5",
  instructions: buildSystemPrompt({
    workingDirectory: workingDir,
    toolNames: ["read", "grep", "bash"],
    sandboxType: "local",
    gitBranch: readGitBranch(workingDir),
    projectContext: getProjectContext(workingDir),
  }),
  tools: toolsWithTask,
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
          toolCalls: [
          { type: "before-last-3-messages", tools: ["bash", "grep"] },
        ],
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
        toolCalls: [
          { type: "before-last-3-messages", tools: ["bash", "grep"] },
        ],
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
