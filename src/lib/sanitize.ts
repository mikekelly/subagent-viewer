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

  // Strip ANSI escape sequences FIRST (before other processing)
  // Why: ANSI codes can interfere with layout and aren't needed in TUI context
  result = result.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  // Replace newlines with spaces to prevent layout breaks
  // Why: Newlines in tool output break single-line card layout in compact mode
  result = result.replace(/\n/g, ' ');

  // Replace tabs with spaces
  // Why: Tabs have variable width and break alignment
  result = result.replace(/\t/g, ' ');

  // Replace carriage returns with nothing
  // Why: Carriage returns cause text overwriting which garbles output
  result = result.replace(/\r/g, '');

  // Remove other control characters (except space)
  // Why: Control chars like \x00, \x01, etc. can break terminal rendering
  // Range: \x00-\x08, \x0B-\x1F (excludes \t, \n, \r which we already handled)
  result = result.replace(/[\x00-\x08\x0B-\x1F]/g, '');

  // Remove zero-width characters
  // Why: These are invisible but can affect layout calculations
  result = result.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // Strip emoji variation selectors (U+FE0F) and text variation selectors (U+FE0E)
  // Why: These modify the display width of preceding characters unpredictably
  result = result.replace(/\uFE0F/g, '');
  result = result.replace(/\uFE0E/g, '');

  // Replace lightning bolt emoji (⚡ U+26A1) with asterisk
  // Why: Main culprit for garbled text - has variable width
  result = result.replace(/⚡/g, '*');

  // Replace rightward arrow (→ U+2192) with pipe
  // Why: Has ambiguous terminal width - causes misalignment in Read tool output
  result = result.replace(/→/g, '|');

  // Remove check mark and cross mark (✓ U+2713, ✗ U+2717)
  // Why: These are double-width characters that break layout
  result = result.replace(/[✓✗]/g, '');

  // Remove other common emojis that have variable widths
  // Why: Wide emojis break layout calculations
  // This regex matches emoji ranges in Unicode
  // Ranges: emoticons, pictographs, transport/map symbols, etc.
  result = result.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');

  return result;
}
