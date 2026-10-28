import { read } from "fs";
import { type Sandbox } from "../sandbox/sandbox";
import createGrepTool from "./grepTool";
import createReadTool from "./readTool";
import { stepCountIs, tool, ToolLoopAgent } from "ai";
import z from "zod";

export function createTaskTool(
  sandbox: Sandbox,
  parentTools: {
    read: ReturnType<typeof createReadTool>;
    grep: ReturnType<typeof createGrepTool>;
  },
) {
  return tool({
    description: `Delegate research to a read-only subagent.
WHEN TO USE: investigating a codebase, finding patterns, gathering context
  across many files.
WHEN NOT TO USE: making changes (the subagent cannot write or run commands).
DO NOT USE FOR: tasks that need decisions or askUser interactions.`,
    inputSchema: z.object({
      description: z.string().describe("What the subagent should investigate"),
    }),
    execute: async ({ description }) => {
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
    },
  });
}
