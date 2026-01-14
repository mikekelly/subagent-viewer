# Agent Orientation

## Purpose
TUI application for real-time viewing of Claude Code subagent activity. Runs via `npx subagent-viewer`.

## Structure
- Project is new — structure TBD during implementation
- Likely TypeScript/Node based on npx distribution requirement

## Key Concepts
- Uses the TUI library that opencode is based on
- Shows live subagents (streaming) and completed subagents (static)
- Left panel: subagent list (live at top, completed below)
- Main view: real-time activity stream (thinking, tool calls, outputs)

## Commands
- TBD once package.json is created

## Research Needed
- How do subagents stream their output?
- What format is the activity data in?
- How can we access this data in real-time?

See IDEAS.md for the full project concept.
