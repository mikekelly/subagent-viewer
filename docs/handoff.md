# Subagent Viewer - Handoff Document

## 1. Current State

### Goal
Build a TUI tool (`npx subagent-viewer`) that monitors Claude Code subagent activity in real-time. Shows a sidebar with agents (active/inactive) and a main panel streaming agent activity (text, tool calls, thinking blocks).

### Where We Are
**Debugging phase** - Core functionality is implemented and working, but there's a persistent **garbled text rendering issue** that hasn't been resolved despite multiple attempts.

### Codebase State
- **Functional but with rendering bugs** - The TUI launches, discovers sessions/agents, displays content, supports scrolling and session switching
- All 76+ tests pass
- Build succeeds

## 2. What's Been Done

### Key Decisions
1. **TUI Library**: Chose **Ink** (React for CLIs) over OpenTUI - OpenTUI is promising but explicitly "not production-ready"
2. **Data Source**: Claude Code stores subagent activity at `~/.claude/projects/{project-path}/{session-id}/subagents/agent-{agentId}.jsonl`
3. **JSONL Format**: Each line is a JSON message with `type`, `uuid`, `agentId`, `slug`, `timestamp`, `message.content`, `message.usage`
4. **Scrolling**: Implemented viewport-based scrolling (slice message array) rather than CSS overflow
5. **Active/Inactive**: Determined by file mtime (< 5 seconds = active)

### Files Structure
```
src/
├── index.tsx              # Entry point, session discovery, render setup
├── components/
│   ├── App.tsx            # Main layout, session tabs, keyboard handling
│   ├── Sidebar.tsx        # Agent list (Active/Inactive sections)
│   ├── ActivityStream.tsx # Message display, scrolling, status bar
│   └── MessageRenderer.tsx # Individual message rendering
├── hooks/
│   ├── useAgentDiscovery.ts  # Watches for agents, polls mtime
│   └── useAgentStream.ts     # Streams JSONL file updates
└── lib/
    ├── session.ts         # Session/path discovery functions
    └── parser.ts          # JSONL parsing, types
```

### Features Implemented
- Session tabs at top (Tab/Shift+Tab to switch)
- Sidebar with "Active agents (n)" and "Inactive agents (n)" sections
- Activity stream with scrolling (j/k, Page Up/Down)
- Status bar: Model, Tokens (input+output), Turns, Scroll position
- Real-time streaming for live agents
- Auto-scroll to bottom for live agents, top for inactive

### Commits (most recent first)
- `ad6c297` - Fix garbled text by using stable message UUIDs as React keys
- `54ef201` - Fix text wrapping and status bar spacing
- `16eb86b` - Add UI improvements: status bar, scroll indicator, sidebar restructure
- `226f133` - Add fixed viewport with scrolling
- `6ff90af` - Fix parser to handle string content in user messages
- `9ef673e` - Polish UI and error handling
- `5480533` - Real-time streaming
- `d52d1f1` - Core UI components
- `b0f0097` - Session and agent discovery
- `f803575` - Project setup

## 3. What's Pending

### Critical Bug: Garbled Text Rendering
The main panel shows garbled/overlapping text. Characters from one line appear mixed with another (e.g., "{ool: Bash" instead of "Tool: Bash").

**Attempted fixes that didn't work:**
1. Adding `overflow="hidden"` to Box components - caused clipping instead
2. Using `wrap="wrap"` on Text components
3. Using stable UUID keys instead of index-based keys
4. Adding ANSI clear-to-end-of-line (`\x1B[K`) via Transform component
5. Clearing screen on startup

**Likely cause:** Ink's differential rendering isn't properly clearing characters when line content changes. This is a known challenge with terminal TUIs when lines have variable widths.

**Potential solutions not yet tried:**
1. Pad all lines to fixed width to force full line rewrites
2. Use Ink's `clear()` method on the render instance before significant updates
3. Try `incrementalRendering: true` in render options
4. Consider alternative approach: use terminal's native scrollback instead of virtual scrolling
5. File issue with Ink / check for known bugs
6. Consider different TUI library

### Other Pending Items
- Mouse wheel scrolling (Ink doesn't have native support, would need raw terminal mouse events)
- User wanted agents named by "agent type" but we're showing agentId - the type might be extractable from the first user message prompt

## 4. Context for Next Agent

### Key Files to Read First
1. `docs/handoff.md` (this file)
2. `src/components/ActivityStream.tsx` - where rendering issues manifest
3. `src/components/MessageRenderer.tsx` - individual message rendering, has Transform wrapper
4. `IDEAS.md` - original project concept

### Important Patterns
- Project uses ESM modules (`"type": "module"` in package.json)
- Build with `npm run build` (uses tsup)
- Run with `node dist/index.js`
- Tests with `npm test` (vitest)

### Data Location
```
~/.claude/projects/-Users-mike-code-subagent-viewer/
├── {session-id}.jsonl           # Main session log
└── {session-id}/
    └── subagents/
        └── agent-{agentId}.jsonl  # Per-agent activity
```

### User Preferences Expressed
- Terminology: "Active/Inactive" not "Live/Completed" (based on mtime detection)
- Single header row with title left, sessions middle, quit hint right
- Status bar showing total tokens (input + output), not just output
- Agents sorted by start time within each section

## 5. Open Questions

### Unresolved
1. **Garbled text root cause** - Is this an Ink bug, terminal-specific, or our code?
2. **Mouse wheel support** - How important is this? Would require significant work.
3. **Agent naming** - User wanted "agent type" as name. Is this in the JSONL data?

### Risks
- The garbled text issue may require abandoning Ink for a different library
- OpenTUI (what opencode uses) is an option but marked "not production-ready"

## 6. Quick Start for Next Agent

```bash
cd /Users/mike/code/subagent-viewer
npm test        # Run tests (should pass)
npm run build   # Build
node dist/index.js  # Run (will see garbled text bug)
```

To reproduce the garbled text:
1. Run the viewer
2. Select an agent with many messages
3. Scroll up/down with j/k
4. Observe characters from different lines mixing together
