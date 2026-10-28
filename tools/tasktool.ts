import { read } from "fs";
import { type Sandbox } from "../sandbox/sandbox";
import createGrepTool from "./grepTool";
import createReadTool from "./readTool";
import { stepCountIs, tool, ToolLoopAgent } from "ai";
import z from "zod";
import createBashTool from "./bashTool";
import createApproval from "../config/approval";

export function createTaskTool(
  sandbox: Sandbox,
  parentTools: {
    read: ReturnType<typeof createReadTool>;
    grep: ReturnType<typeof createGrepTool>;
    bash: ReturnType<typeof createBashTool>;
  },
) {
  return tool({
    description: `Delegate research to a read-only subagent.
WHEN TO USE: investigating a codebase, finding patterns, gathering context
  across many files.
WHEN NOT TO USE: making changes (the subagent cannot write or run commands).
DO NOT USE FOR: tasks that need decisions or askUser interactions.`,
    inputSchema: z.object({
      description: z.string().describe("Task instructions to subagent"),
      subagentType: z
        .enum(["explorer", "executor"])
        .default("explorer")
        .describe("Type of subagent to delegate to"),
    }),
    execute: async ({ description, subagentType }) => {
      if (subagentType === "explorer") {
        const explorer = new ToolLoopAgent({
          model: "anthropic/claude-haiku-4.5",
          instructions: `You are an explorer agent. Investigate and report back concisely.
    Working directory: ${sandbox.workingDirectory}`,
          tools: { read: parentTools.read, grep: parentTools.grep },
          stopWhen: stepCountIs(5),
        });
        try {
          const { text, steps } = await explorer.generate({
            prompt: description,
          });
          return text
            ? `[Explorer: ${steps.length} steps]\n${text}`
            : "(no response from subagent)";
        } catch (error: any) {
          return `Subagent error: ${error.message}`;
        }
      } else if (subagentType === "executor") {
        const executorBash = createBashTool(
          sandbox,
          createApproval({
            mode: "delegated",
            trust: ["npm test", "npm run build", "npx tsc"],
          }),
        );
        const executor = new ToolLoopAgent({
          model: "anthropic/claude-sonnet-4.6",
          instructions: `You are an executor agent. Follow instructions precisely.
Working directory: ${sandbox.workingDirectory}
Do NOT ask questions. Do NOT explore beyond what's needed. Execute the task.`,
          tools: {
            read: parentTools.read,
            grep: parentTools.grep,
            bash: executorBash,
          },
          stopWhen: stepCountIs(15),
        });
        try {
          const { text, steps } = await executor.generate({
            prompt: description,
          });
          return text
            ? `[Executor: ${steps.length} steps]\n${text}`
            : "(no response from subagent)";
        } catch (error: any) {
          return `Subagent error: ${error.message}`;
        }
      }
    },
  });
}
