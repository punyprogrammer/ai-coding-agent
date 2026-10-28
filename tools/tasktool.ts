import { read } from "fs";
import { type Sandbox } from "../sandbox/sandbox";
import createGrepTool from "./grepTool";
import createReadTool from "./readTool";
import { stepCountIs, tool, ToolLoopAgent, type ToolSet } from "ai";
import z from "zod";
import createBashTool from "./bashTool";

// Factory for explorer tool
function buildExplorer(
  sandbox: Sandbox,
  parentTools: { read: any; grep: any },
) {
  return new ToolLoopAgent({
    model: "anthropic/claude-haiku-4.5",
    instructions: `You are an explorer agent. Investigate and report back concisely.
  Working directory: ${sandbox.workingDirectory}
  Read each file at most once.`,
    tools: {
      read: createReadTool(sandbox.workingDirectory, sandbox),
      grep: parentTools.grep,
    },
    stopWhen: stepCountIs(5),
  });
}
// Factory for executor bash tool
function buildExecutor(
  sandbox: Sandbox,
  parentTools: {
    read: any;
    grep: any;
  },
) {
  const executorBash = createBashTool(sandbox.workingDirectory, sandbox);
  return new ToolLoopAgent({
    model: "anthropic/claude-sonnet-4.6",
    instructions: `You are an executor agent. Follow instructions precisely.
Working directory: ${sandbox.workingDirectory}
Do NOT ask questions. Do NOT explore beyond what's needed. Execute the task.
Read each file at most once.`,
    tools: {
      read: createReadTool(sandbox.workingDirectory, sandbox),
      grep: parentTools.grep,
      bash: executorBash,
    },
    stopWhen: stepCountIs(15),
  });
}
async function runSubagent<TOOLS extends ToolSet>(
  role: string,
  agent: ToolLoopAgent<never, TOOLS>,
  description: string,
) {
  try {
    const { text, steps } = await agent.generate({ prompt: description });
    return text
      ? `[${role}: ${steps.length} steps]\n${text}`
      : `(no response from ${role})`;
  } catch (e: any) {
    return `${role} error: ${e.message}`;
  }
}
export function createTaskTool(
  sandbox: Sandbox,
  parentTools: { read: any; grep: any },
) {
  // Lesson 4: Task tool
  // Spawns a specialised subagent and delegates a task to it, then returns the result.
  // Primary utility: offloads expensive or wide-ranging work to purpose-built agents —
  // a lightweight "explorer" (Haiku, read-only) for research and pattern gathering, or
  // a capable "executor" (Sonnet + bash) for multi-step implementation — keeping the
  // parent agent focused on high-level orchestration rather than low-level details.
  return tool({
    description: `Delegate work to a subagent.
  Explorer (default): read-only research with Haiku. Use for searching across files,
    understanding patterns, and gathering context.
  Executor: implementation with Sonnet and delegated bash. Use for focused
    changes with explicit instructions and a known verification step.
   
  WHEN TO USE: research across many files (explorer), bulk implementation (executor).
  WHEN NOT TO USE: ambiguous requirements (use askUser), architectural decisions
    (the parent decides).
  DO NOT USE FOR: single-step tasks the parent can do directly.`,
    inputSchema: z.object({
      description: z.string().describe("Task instructions for the subagent"),
      subagentType: z
        .enum(["explorer", "executor"])
        .default("explorer")
        .describe("Subagent role"),
    }),
    execute: async ({ description, subagentType }) => {
      if (subagentType === "executor") {
        return runSubagent(
          subagentType,
          buildExecutor(sandbox, parentTools),
          description,
        );
      }
      return runSubagent(
        subagentType,
        buildExplorer(sandbox, parentTools),
        description,
      );
    },
  });
}
