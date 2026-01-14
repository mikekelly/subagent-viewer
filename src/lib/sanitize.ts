/**
 * Sanitizes text by removing problematic Unicode characters that have
 * variable display widths and can confuse TUI layout engines.
 *
 * Why: The TUI shows garbled text when emojis with variation selectors
 * or double-width characters are rendered. This sanitization ensures
 * consistent single-width character rendering.
 */
export function sanitizeText(text: string): string {
  let result = text;

  // Strip emoji variation selectors (U+FE0F) and text variation selectors (U+FE0E)
  // Why: These modify the display width of preceding characters unpredictably
  result = result.replace(/\uFE0F/g, '');
  result = result.replace(/\uFE0E/g, '');

  // Replace lightning bolt emoji (⚡ U+26A1) with asterisk
  // Why: Main culprit for garbled text - has variable width
  result = result.replace(/⚡/g, '*');

  // Remove other common emojis that have variable widths
  // Why: Wide emojis break layout calculations
  // This regex matches emoji ranges in Unicode
  // Ranges: emoticons, pictographs, transport/map symbols, etc.
  result = result.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');

  // Strip ANSI escape sequences as safety measure
  // Why: ANSI codes can interfere with layout and aren't needed in TUI context
  result = result.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  return result;
}
