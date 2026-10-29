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
    - No new dependencies without asking
    - Read each file at most once. Use the earlier result instead of reading it again.
    - Do not delegate the same investigation twice. Use the earlier subagent result.`);
  if (context.projectContext) {
    sections.push(`
    # Project Instructions (from AGENTS.md)
    ${context.projectContext}`);
  }
  //   push verification gate
  sections.push(`
    # Verification
    After making changes, verify your work:
    1. Run \`npx tsc --noEmit\` when TypeScript is present
    2. Run lint, test, or build commands only if they exist in this project and are allowed by the current approval mode
    3. Report exactly what you ran, what was blocked, and what was unavailable
    4. Do NOT inflate partial verification into a blanket success claim
     
    Do NOT claim "tests pass" without running them.
    Scope your claims honestly. "Verification was limited because writes were blocked" is honest.
    "All tests pass" when you didn't run them is not.`);
  // add ambuiguity
  sections.push(`
    # Handling Ambiguity
    When the task is ambiguous or has multiple valid approaches:
    1. Search the code or docs to gather context first
    2. Use askUser to let the user choose. Do NOT guess.
    3. Examples: "add auth" -> ask OAuth or JWT; "set up a db" -> ask Postgres or SQLite
     
    Specific tasks (with file paths, line numbers, or precise instructions) do not
    need askUser. Act directly.`);
}
