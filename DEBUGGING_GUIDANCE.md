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

## OpenTUI Rendering Issues

### Garbled Text / Character Overlap (OpenTUI)
**Symptom**: Text from different panels overlaps or mixes together. Characters appear in wrong positions. Content is unreadable with jumbled timestamps and text bleeding across panel boundaries.

**Root cause**: Multiple types of problematic characters can cause garbled text:
1. **Double-width Unicode characters** (emojis): OpenTUI counts each emoji as 1 character for positioning, but terminals render them as 2 characters wide
2. **Control characters**: Newlines (`\n`), tabs (`\t`), carriage returns (`\r`) break single-line card layouts
3. **ANSI escape codes**: Color codes and other terminal sequences from tool output
4. **Zero-width characters**: Invisible characters that affect layout calculations
5. **Variation selectors**: Unicode modifiers that change character display width

**Common sources**: Tool output from JSONL files often contains terminal output with ANSI codes, newlines, tabs, and emojis.

**Solution**: Aggressive sanitization in `sanitizeText()` function that handles ALL problematic character types:
- Strip ANSI escape sequences FIRST (before other processing)
- Replace newlines and tabs with spaces
- Remove carriage returns and control characters
- Remove zero-width characters and variation selectors
- Replace or remove double-width emojis

**Why order matters**: Strip ANSI codes first, then handle whitespace/control chars, then emojis. This prevents partial ANSI codes from being left behind.

**Pattern to use**:
1. Keep all display logic using single-width ASCII characters
2. Apply `sanitizeText()` to ALL user-provided or tool-generated content before display
3. Test with real tool output that contains mixed content (ANSI codes + newlines + emojis)

**Test pattern**:
```typescript
it('should handle tool output with complex mixed content', () => {
  // Simulate real tool output with ANSI codes, newlines, tabs, emojis
  const input = '\x1B[32m✓\x1B[0m Success\n\tResult:\ttrue\n\tStatus:\t200';
  const result = sanitizeText(input);

  // Should not have ANY problematic characters
  expect(result).not.toMatch(/\x1B\[[0-9;]*[a-zA-Z]/);
  expect(result).not.toContain('\n');
  expect(result).not.toContain('\t');
  expect(result).not.toContain('✓');
  expect(result).toContain('Success');
}
```

## OpenTUI Scroll Calculation Issues

### Can't Scroll to Bottom / Scroll Range Off By N Lines
**Symptom**: User cannot scroll all the way to the bottom of content. The last N lines remain unreachable no matter how much they scroll down.

**Root cause**: Double-subtraction (or N-times subtraction) of reserved space for UI elements like headers, footers, or indicators. This happens when:
1. One function subtracts space for UI elements from available height
2. Another function using that result subtracts the same space again
3. The scroll range calculation uses an intermediate value that doesn't match what's actually displayed

**Example of the bug**:
```typescript
// Bug: Double subtraction
const getVisibleLines = () => {
  return panelHeight - overhead - 2; // Subtract 2 for indicators
};

const updateDisplay = () => {
  const visibleLines = getVisibleLines();
  const contentLines = visibleLines - 2; // DOUBLE SUBTRACTION!
  const maxScroll = totalLines - visibleLines; // Wrong reference!
  // ...
};
```

**Solution**: Subtract reserved space exactly ONCE, and ensure all calculations use consistent references:
```typescript
// Fixed: Single subtraction
const getVisibleLines = () => {
  return panelHeight - overhead; // Don't subtract indicator space here
};

const updateDisplay = () => {
  const visibleLines = getVisibleLines();
  const contentLines = visibleLines - 2; // Subtract once for indicators
  const maxScroll = totalLines - contentLines; // Use the same value for range
  // ...
};
```

**Why this matters**: Every calculation in the scroll system must agree on how much content fits. If `maxScroll` is calculated with `visibleLines` but content is sliced using `contentLines`, the ranges don't match and you get unreachable content.

**Diagnostic steps**:
1. Find all places where space is subtracted for UI elements
2. Trace how that value flows through calculations
3. Ensure `maxScrollOffset` uses the same "lines to display" value as the actual content slicing
4. Check that scroll event handlers use the same calculation as the main render

## Text Content Sanitization

### Newlines Stripped When They Should Be Preserved
**Symptom**: Multi-line content (like JSON, multi-paragraph text, or formatted output) appears as a single continuous line with no line breaks.

**Root cause**: Sanitization function unconditionally strips newlines without considering whether the display mode needs them. This happens when sanitization was originally designed for compact/single-line display but is then used in a verbose/multi-line mode.

**Solution**: Coordinate between sanitization and rendering:
1. If you need to preserve multi-line formatting, don't strip newlines in sanitization
2. Update the rendering function to split on newlines and create separate display lines
3. Keep other sanitization (ANSI codes, tabs, emojis) to prevent layout issues

**Example**:
```typescript
// Before: Strips all newlines
function sanitize(text: string): string {
  let result = text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, ''); // Strip ANSI
  result = result.replace(/\n/g, ' '); // Strip newlines - BAD if you need them!
  return result;
}

// After: Preserves newlines
function sanitize(text: string): string {
  let result = text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, ''); // Strip ANSI
  // DON'T strip newlines if multi-line display is needed
  result = result.replace(/\t/g, ' '); // Still fix tabs
  return result;
}

// Rendering handles newlines:
function formatContent(content: string): string[] {
  const sanitized = sanitize(content);
  return sanitized.split('\n'); // Split into separate lines for display
}
```

**Why this matters**: Text sanitization and text formatting are separate concerns. Sanitization should remove problematic characters that break layout. Formatting should handle structure (like line breaks).
