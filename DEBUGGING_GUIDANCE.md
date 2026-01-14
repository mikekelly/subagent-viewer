# Debugging Guidance

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
