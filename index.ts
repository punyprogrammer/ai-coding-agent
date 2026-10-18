import { ToolLoopAgent, stepCountIs } from "ai";
const cmd = process.argv[2] || process.cwd();
const agent = new ToolLoopAgent({
  model: "anthropic/claude-haiku-4.5",
  instructions: `You are a coding agent .\nWorking directory: ${cmd}`,
  tools: {},
  stopWhen: stepCountIs(10),
});
const prompt = process.argv.slice(3).join(" ") || "Hello";
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(steps.map((step) => step.toolCalls).join("\n"));
