# subagent-viewer

A Terminal User Interface (TUI) for viewing Claude Code subagent activity in real-time.

## What is this?

When using Claude Code, the main agent often delegates work to subagents running in parallel. This tool provides a live view of what each subagent is doing, making it easy to monitor progress across multiple concurrent tasks.

## Installation & Usage

Requires [Bun](https://bun.sh) runtime.

### Quick run (no install)

```bash
bunx subagent-viewer
```

### Install globally

```bash
bun install -g subagent-viewer
subagent-viewer
```

## Features

- Real-time monitoring of active subagent sessions
- Displays subagent activity including tool calls and outputs
- Automatic session discovery from Claude Code task output directory
- Clean TUI interface with keyboard navigation

## How it works

The viewer monitors the `.task-output` directory where Claude Code stores subagent session files. It automatically detects new sessions and displays their activity in real-time.

## License

MIT
