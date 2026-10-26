export interface PromptContext {
  workingDirectory: string;
  sandboxType: string;
  toolNames: string[];
  gitBranch?: string;
  projectContext?: string;
}

export function buildSystemPrompt(context: PromptContext) {
  const sections: string[] = [];
  sections.push(
    `You are a coding agent working in: ${context.workingDirectory}`,
  );
  if (context.sandboxType) {
    sections.push(`Sandbox: ${context.sandboxType}`);
  }
  sections.push(`
    # Agency
    - USE your tools. Read files, search code, run commands, then answer.
    - Do NOT explain what you WOULD do. Actually do it.
    - Available tools: ${context.toolNames.join(", ")}`);
  if (context.gitBranch) {
    sections.push(`- Current Git Branch: ${context.gitBranch}`);
  }
  sections.push(`
    # Guardrails
    - Prefer simple, minimal changes
    - Search before creating, and reuse existing patterns
    - No new dependencies without asking`);
  if (context.projectContext) {
    sections.push(`
    # Project Instructions (from AGENTS.md)
    ${context.projectContext}`);
  }
  console.log("instructions", sections.join("\n"));
  return sections.join("\n");
}
