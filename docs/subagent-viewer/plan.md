# Subagent Viewer - Architecture & Plan

## Tech Stack

- **Runtime**: Node.js (TypeScript)
- **TUI Framework**: Ink (React for CLIs)
- **Package**: Published as `subagent-viewer` on npm, runnable via `npx`

## Data Source

Subagent activity is stored in JSONL files:

```
~/.claude/projects/{project-path}/{session-id}/subagents/agent-{agentId}.jsonl
```

Each line is a JSON message:
```json
{
  "type": "user" | "assistant",
  "agentId": "ab34798",
  "slug": "steady-wiggling-church",
  "timestamp": "2026-01-14T17:42:28.489Z",
  "message": {
    "role": "user" | "assistant",
    "content": [
      { "type": "text", "text": "..." },
      { "type": "tool_use", "name": "Bash", "input": {...} },
      { "type": "thinking", "thinking": "..." }
    ]
  }
}
```

Tool results appear in user messages as `tool_result` content blocks.

## Session Discovery

1. Find project path from CWD: `/-Users-mike-code-subagent-viewer` format
2. List sessions in `~/.claude/projects/{project-path}/`
3. Find most recent session (by mtime or newest UUID directory)
4. Watch `{session-id}/subagents/` for agent files

## Architecture

```
src/
├── index.tsx           # Entry point, CLI setup
├── App.tsx             # Main Ink app component
├── components/
│   ├── Sidebar.tsx     # Agent list (live + completed)
│   ├── ActivityStream.tsx  # Real-time activity display
│   └── MessageRenderer.tsx # Renders individual messages
├── hooks/
│   ├── useAgentDiscovery.ts  # Watches for new agents
│   └── useAgentStream.ts     # Streams JSONL file updates
└── lib/
    ├── session.ts      # Session discovery logic
    └── parser.ts       # JSONL message parsing
```

## Key Implementation Details

### Agent Discovery (`useAgentDiscovery`)
- Use `fs.watch` on the subagents directory
- Parse each `.jsonl` file to get agent metadata (agentId, slug, first timestamp)
- Determine live vs completed by checking if file is still being written (mtime within last few seconds)

### Activity Streaming (`useAgentStream`)
- Use `fs.watch` + `fs.read` with file position tracking
- On file change, read new bytes from last position
- Parse complete JSONL lines, emit to React state

### Layout (Ink Flexbox)
```tsx
<Box flexDirection="row" height="100%">
  <Box width={30} borderStyle="single">
    <Sidebar agents={agents} selected={selected} />
  </Box>
  <Box flexGrow={1}>
    <ActivityStream agentId={selected} />
  </Box>
</Box>
```

## Implementation Phases

### Phase 1: Project Setup
- Initialize npm package with TypeScript + Ink
- Set up build tooling (tsup or similar)
- Create bin entry for `subagent-viewer` command

### Phase 2: Session Discovery
- Implement project path detection
- Implement session discovery
- Implement agent file discovery

### Phase 3: Core UI
- Sidebar component with agent list
- Activity stream component
- Message rendering (text, tool calls, thinking)

### Phase 4: Real-time Streaming
- File watching for new agents
- JSONL streaming for activity updates
- Live/completed status detection

### Phase 5: Polish
- Keyboard navigation
- Scroll behavior
- Error handling (no session found, etc.)
