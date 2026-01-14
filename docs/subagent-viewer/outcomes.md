# Subagent Viewer - Outcomes

## What Success Looks Like

A TUI tool that developers can run via `npx subagent-viewer` to monitor Claude Code subagent activity in real-time.

## Acceptance Criteria

1. **Launch**: `npx subagent-viewer` starts a TUI in the current terminal
2. **Agent Discovery**: Automatically finds the current Claude Code session and its subagents
3. **Sidebar**: Left panel lists agents - live agents at top (sorted by start time), completed agents below
4. **Activity Stream**: Main panel shows real-time activity for the selected agent:
   - Text output (assistant responses)
   - Tool calls (name + parameters)
   - Tool results (truncated for readability)
   - Thinking blocks (if present)
5. **Navigation**: Arrow keys to select different agents in sidebar
6. **View-only**: No interaction with agents, just observation

## Out of Scope (MVP)

- Filtering/search
- Export logs
- Kill agents
- Multiple session support (only current session)
- Historical session browsing
