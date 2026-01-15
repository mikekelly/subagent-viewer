import { describe, it, expect } from 'vitest';
import { sanitizeText } from '../lib/sanitize.js';

describe('sanitizeText', () => {
  it('should strip emoji variation selectors (U+FE0F)', () => {
    // ⚡️ is U+26A1 + U+FE0F (emoji variation selector)
    const input = '⚡️ Lightning bolt';
    const result = sanitizeText(input);

    // Should strip the variation selector and replace the emoji
    expect(result).not.toContain('\uFE0F');
    expect(result).not.toContain('⚡'); // Base emoji should be replaced
    expect(result).toContain('Lightning bolt');
  });

  it('should strip text variation selectors (U+FE0E)', () => {
    const input = 'Test ◀\uFE0E text';
    const result = sanitizeText(input);

    expect(result).not.toContain('\uFE0E');
  });

  it('should replace problematic lightning bolt emoji', () => {
    const input = '⚡ Starting task';
    const result = sanitizeText(input);

    // Should replace ⚡ with * or remove it
    expect(result).not.toContain('⚡');
    // Should contain either * or just the rest of the text
    expect(result).toContain('Starting task');
  });

  it('should handle lightning bolt with variation selector', () => {
    const input = '⚡️ Starting task';
    const result = sanitizeText(input);

    // Should not contain the emoji or variation selector
    expect(result).not.toContain('⚡');
    expect(result).not.toContain('\uFE0F');
    expect(result).toContain('Starting task');
  });

  it('should strip ANSI escape sequences', () => {
    const input = '\x1B[31mRed text\x1B[0m normal';
    const result = sanitizeText(input);

    expect(result).not.toMatch(/\x1B\[[0-9;]*[a-zA-Z]/);
    expect(result).toContain('Red text');
    expect(result).toContain('normal');
  });

  it('should replace rightward arrow and preserve other safe Unicode characters', () => {
    const input = 'Test → bullet ● ellipsis … text';
    const result = sanitizeText(input);

    // Rightward arrow should be replaced with pipe
    expect(result).not.toContain('→');
    expect(result).toContain('|');
    // Other safe characters should be preserved
    expect(result).toContain('●');
    expect(result).toContain('…');
    expect(result).toContain('Test');
    expect(result).toContain('text');
  });

  it('should handle empty string', () => {
    const result = sanitizeText('');
    expect(result).toBe('');
  });

  it('should handle plain ASCII text', () => {
    const input = 'Hello world!';
    const result = sanitizeText(input);
    expect(result).toBe('Hello world!');
  });

  it('should handle multiple emojis in one string', () => {
    const input = '⚡ Task 1 ⚡ Task 2';
    const result = sanitizeText(input);

    expect(result).not.toContain('⚡');
    expect(result).toContain('Task 1');
    expect(result).toContain('Task 2');
  });

  it('should remove or replace other emojis', () => {
    const input = 'Test 🔥 fire 👍 thumbs';
    const result = sanitizeText(input);

    // Should not contain the emojis
    expect(result).not.toContain('🔥');
    expect(result).not.toContain('👍');
    // Should still have the text
    expect(result).toContain('fire');
    expect(result).toContain('thumbs');
  });

  it('should handle complex ANSI sequences', () => {
    const input = '\x1B[1;31;40mBold red on black\x1B[0m';
    const result = sanitizeText(input);

    expect(result).not.toMatch(/\x1B\[[0-9;]*[a-zA-Z]/);
    expect(result).toContain('Bold red on black');
  });

  it('should preserve three dots from truncation', () => {
    const input = 'Some text...';
    const result = sanitizeText(input);

    expect(result).toBe('Some text...');
  });

  it('should replace newlines with spaces to prevent layout breaks', () => {
    const input = 'Line 1\nLine 2\nLine 3';
    const result = sanitizeText(input);

    expect(result).not.toContain('\n');
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
    expect(result).toContain('Line 3');
  });

  it('should replace tabs with spaces', () => {
    const input = 'Col1\tCol2\tCol3';
    const result = sanitizeText(input);

    expect(result).not.toContain('\t');
    expect(result).toContain('Col1');
    expect(result).toContain('Col2');
    expect(result).toContain('Col3');
  });

  it('should replace carriage returns', () => {
    const input = 'Text\rOverwrite';
    const result = sanitizeText(input);

    expect(result).not.toContain('\r');
  });

  it('should remove zero-width characters', () => {
    const input = 'Test\u200BZero\u200CWidth\u200DSpace\uFEFF';
    const result = sanitizeText(input);

    expect(result).not.toContain('\u200B'); // Zero-width space
    expect(result).not.toContain('\u200C'); // Zero-width non-joiner
    expect(result).not.toContain('\u200D'); // Zero-width joiner
    expect(result).not.toContain('\uFEFF'); // Zero-width no-break space
    expect(result).toContain('Test');
    expect(result).toContain('Zero');
    expect(result).toContain('Width');
    expect(result).toContain('Space');
  });

  it('should handle control characters', () => {
    const input = 'Test\x00\x01\x02Control\x0B\x0CChars';
    const result = sanitizeText(input);

    // Should not contain control characters
    expect(result).not.toMatch(/[\x00-\x08\x0B-\x1F]/);
    expect(result).toContain('Test');
    expect(result).toContain('Control');
    expect(result).toContain('Chars');
  });

  it('should handle tool output with complex mixed content', () => {
    // Simulate real tool output with ANSI codes, newlines, tabs
    const input = '\x1B[32m✓\x1B[0m Success\n\tResult:\ttrue\n\tStatus:\t200';
    const result = sanitizeText(input);

    // Should not have ANSI codes, newlines, tabs, or check mark emoji
    expect(result).not.toMatch(/\x1B\[[0-9;]*[a-zA-Z]/);
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\t');
    expect(result).not.toContain('✓');
    expect(result).toContain('Success');
    expect(result).toContain('Result:');
    expect(result).toContain('true');
  });
});
