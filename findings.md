# Project Analysis Summary

## Project Overview
This is an **AI Coding Agent** built with TypeScript and Bun, designed to autonomously perform coding tasks using tool-based iteration.

## Project Configuration

### package.json
- **Name**: `ai-coding-agent` (private module)
- **Type**: ESM (ES modules)
- **Runtime**: Bun
- **Key Scripts**:
  - `start`: Runs `bun run index.ts`
  - `typecheck`: Type checking with `tsc --noEmit`
- **Dependencies**:
  - `ai` (^6.0.69): AI SDK for tool-based agents
  - `just-bash` (^3.6.0): Bash execution tool
  - `zod` (^4.3.6): Schema validation
- **DevDependencies**:
  - `@types/node` (^20)
  - `typescript` (^5)

### tsconfig.json
- **Target**: ESNext
- **Module System**: ESNext
- **Module Resolution**: bundler
- **Strict Mode**: Enabled
- **No Emit**: True (type checking only)
- **Type Checking**: Includes Node types
- **Scope**: All TS files included

## Main Application (index.ts)

### Architecture
The application implements a **ToolLoopAgent** pattern with the following components:

#### Tools Available
1. **read**: File content reading
2. **grep**: Pattern searching across files
3. **bash**: Command execution

#### Core Features
- **Sandbox Support**: Two sandbox types supported
  - `local`: Local execution (default)
  - `just-bash`: Just-bash sandbox (via env variable)
- **Message Pruning**: Implements message optimization
  - Uses `pruneMessages()` from AI SDK
  - Strategy: Keep `before-last-3-messages` of tool calls
  - Applied in both `prepareCall` and `prepareStep` hooks
- **Step Limitation**: Agent stops after 10 steps
- **Model**: Anthropic Claude Haiku 4.5
- **Token Tracking**: Logs token usage and tool calls per step

#### Execution Flow
1. Initialize sandbox (local or just-bash)
2. Create ToolLoopAgent with configured tools and system prompt
3. Accept user prompt from CLI (default: "Hello")
4. Run agent for max 10 steps with message pruning
5. Output results and tool call history
6. Cleanup: Stop sandbox with lifecycle hooks

### Key Implementation Details
- **Working Directory**: Configurable via CLI argument (defaults to `cwd()`)
- **Approval Mode**: "background" for bash operations
- **Project Context**: Injected from external source
- **Git Branch**: Injected from git repository
- **Error Handling**: Graceful error handling in bash tool with proper cleanup

## Project Status
- **Branch**: `feat/implement-message-pruning` (feature branch for message optimization)
- **Focus**: Message pruning implementation to manage token usage and conversation history

## Technology Stack
- TypeScript with strict type checking
- ESM modules with bundler resolution
- Bun as runtime/package manager
- Claude Haiku as LLM backbone
- Tool-based agentic pattern (LLM + Tools Loop)
