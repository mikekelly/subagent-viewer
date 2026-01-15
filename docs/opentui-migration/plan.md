# OpenTUI Migration Plan

## Why

Ink's differential rendering has persistent garbled text issues. Despite trying:
- Stable UUID keys
- ANSI clear-to-end-of-line codes
- Text sanitization (emojis, Unicode arrows)
- Removing all hacks for clean Ink usage
- Virtual scrolling fixes

The core problem is Ink's rendering model doesn't properly clear stale characters when content changes. OpenTUI uses a different approach (FrameBuffer with cell-level control, Yoga layout) that should avoid this.

## Approach

**Keep**: `src/lib/` (session discovery, JSONL parsing, sanitization, types)
**Rewrite**: `src/components/`, `src/index.tsx`, `src/hooks/`

**Framework choice**: `@opentui/core` (imperative API)
- More control over rendering
- Passive mode renders only on changes
- Cell-level FrameBuffer control if needed
- Simpler than adding SolidJS dependency

## Risks

1. **Not production ready** - OpenTUI explicitly states this
2. **Zig dependency** - Required for building
3. **Limited docs** - Sparse examples, small community
4. **API churn** - Pre-1.0, may have breaking changes

Mitigation: We have `backup/ink-attempt` branch to fall back to.

## Component Mapping

| Ink (current) | OpenTUI equivalent |
|---------------|-------------------|
| `<Box>` | `BoxRenderable` or `GroupRenderable` |
| `<Text>` | `TextRenderable` |
| Session tabs | `TabSelectRenderable` |
| Agent list | `SelectRenderable` or custom |
| Scrolling | Manual slice + re-render |
| Keyboard | `renderer.keyInput.on("keypress", ...)` |

## Phase 1: Spike (validate OpenTUI works)

**Objective**: Minimal proof-of-concept showing text renders cleanly

1. Delegate: Install `@opentui/core`, verify Zig requirement
2. Delegate: Create minimal `src/index-opentui.tsx`:
   - Initialize CliRenderer
   - Render a BoxRenderable with border
   - Render TextRenderable with sample JSONL content
   - Add keyboard quit (q)
3. Verify: No garbled text on resize/updates

**Success criteria**: Clean text rendering without artifacts

## Phase 2: Core UI structure

**Objective**: Layout matching current UI

1. Delegate: Header bar (title left, session tabs center, quit hint right)
2. Delegate: Sidebar (BoxRenderable with border, agent list)
3. Delegate: Main panel (activity stream area)
4. Delegate: Status bar (model, tokens, turns, scroll position)

## Phase 3: Interactivity

**Objective**: Keyboard navigation working

1. Delegate: Tab/Shift+Tab for session switching (TabSelectRenderable)
2. Delegate: Up/Down or j/k for agent selection
3. Delegate: j/k/PageUp/PageDown for scrolling activity stream
4. Delegate: q to quit

## Phase 4: Data integration

**Objective**: Wire up existing hooks/lib

1. Delegate: Connect session discovery (`src/lib/session.ts`)
2. Delegate: Connect agent discovery (adapt `useAgentDiscovery` logic)
3. Delegate: Connect JSONL streaming (adapt `useAgentStream` logic)
4. Delegate: Message rendering with sanitization

## Phase 5: Polish

1. Delegate: Auto-scroll for live agents
2. Delegate: Active/inactive agent sections
3. Delegate: Error handling
4. Delegate: Update handoff.md

## Out of scope (for now)

- Mouse wheel scrolling
- Agent type naming (vs agentId)
- Tests for OpenTUI components (spike first)
