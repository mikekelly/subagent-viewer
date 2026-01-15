# Debugging Guidance

## OpenTUI Keyboard Event Handling

### Invalid Event Listener on Specific Keys
**Symptom**: Keyboard shortcuts (like 'q' to quit) don't work. No errors in console.

**Root cause**: OpenTUI's KeyHandler only emits three events: `keypress`, `keyrelease`, and `paste`. You cannot listen to specific key names like `renderer.keyInput.on("q", ...)`.

**Solution**: Handle all keyboard input in the `keypress` event handler and check `event.name`:

```typescript
renderer.keyInput.on("keypress", async (event) => {
  if (event.name === "q") {
    // Handle quit
  }
  else if (event.name === "tab") {
    // Handle tab
  }
  // ... other keys
});
```

**Why this fails**:
- `renderer.keyInput.on("q", ...)` - Never triggers, "q" is not a valid event type
- KeyHandler extends EventEmitter but only emits `keypress`, `keyrelease`, `paste`

**Pattern to use**: Single `keypress` handler with if/else-if chain checking `event.name`.

## Ink TUI Rendering Issues

### Garbled Text / Character Overlap
**Symptom**: Text from different lines overlaps or mixes together, especially when scrolling or when content updates. Characters from old renders remain visible.

**Root cause**: Ink uses differential rendering - it only updates changed regions. When new content is shorter than previous content, leftover characters remain on screen. This is a classic TUI problem with variable-width lines.

**Solution**: Use Transform component to append ANSI escape code `\x1B[K` (clear to end of line) to each rendered text line. See ClearText wrapper in components.

**Why other approaches fail**:
- `overflow="hidden"` only affects clipping logic, not what's written to terminal
- Stable React keys help reconciliation but don't affect Ink's terminal output
- Screen clear on startup doesn't prevent mid-render artifacts

**Pattern to use**:
```tsx
const CLEAR_TO_EOL = '\x1B[K';

function ClearText({ children, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Transform transform={(line) => line + CLEAR_TO_EOL}>
      <Text {...props}>{children}</Text>
    </Transform>
  );
}
```

Apply this wrapper to all Text components that display variable-length content.

## Agent Selection Navigation Issues

### Random Jumps When Navigating or Selection Pointing to Wrong Agent
**Symptom**: When navigating through agents with Up/Down arrows, the selection jumps randomly to different agents. Or when staying on one agent, the selection suddenly shifts to a different agent after a few seconds.

**Root cause**: Agent arrays are built from filesystem directory reads, which return files in arbitrary order. If agents aren't sorted consistently, the array order can change between calls. The periodic refresh (every 3 seconds) reloads agents, potentially reordering the array while `selectedAgentIndex` stays the same numeric value - now pointing to a different agent.

**Example**:
```
Initial: agents = [a, b, c], selectedAgentIndex = 1 (agent 'b')
After refresh: agents = [c, a, b], selectedAgentIndex = 1 (now agent 'a'!)
```

**Solution**: Sort agents consistently by a stable property like `startTime`:
```typescript
agents.sort((a, b) => a.startTime.localeCompare(b.startTime));
```

**Why this matters**: Index-based selection requires stable array ordering. Without sorting, filesystem order changes cause indices to point to different agents across refreshes.
