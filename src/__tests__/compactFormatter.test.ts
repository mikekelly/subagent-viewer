import { describe, it, expect } from 'vitest';
import { formatMessageCompact } from '../lib/compactFormatter.js';
import { AgentMessage } from '../lib/parser.js';

describe('formatMessageCompact', () => {
  it('should format user message with blue color', () => {
    const message: AgentMessage = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: 'Fix the bug'
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('[U] User:');
    expect(result[0]).toContain('Fix the bug');
    expect(result[0]).toContain('\x1b[34m'); // Blue color code
  });

  it('should format thinking block with dim/gray color', () => {
    const message: AgentMessage = {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'I should check the file first' }
        ]
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('[?] Thinking:');
    expect(result[0]).toContain('I should check the file first');
    expect(result[0]).toContain('\x1b[2m'); // Dim color code
  });

  it('should format text block with default color', () => {
    const message: AgentMessage = {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Here is the solution' }
        ]
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('[T] Text:');
    expect(result[0]).toContain('Here is the solution');
  });

  it('should format tool_use with yellow color', () => {
    const message: AgentMessage = {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool123',
            name: 'Bash',
            input: { command: 'npm test', description: 'Run tests' }
          }
        ]
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('[>] Tool: Bash');
    expect(result[0]).toContain('npm test');
    expect(result[0]).toContain('\x1b[33m'); // Yellow color code
  });

  it('should format tool_result with green color and success indicator', () => {
    const message: AgentMessage = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool123',
            content: 'Tests passed!'
          }
        ]
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('[OK] Result:');
    expect(result[0]).toContain('Tests passed!');
    expect(result[0]).toContain('\x1b[32m'); // Green color code
  });

  it('should truncate user messages longer than 200 chars', () => {
    const longContent = 'x'.repeat(250);
    const message: AgentMessage = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: longContent
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('...');
    expect(result[0].length).toBeLessThan(longContent.length);
  });

  it('should truncate tool input longer than 80 chars', () => {
    const longCommand = 'x'.repeat(100);
    const message: AgentMessage = {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool123',
            name: 'Bash',
            input: { command: longCommand }
          }
        ]
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('...');
  });

  it('should truncate tool result longer than 100 chars', () => {
    const longResult = 'x'.repeat(150);
    const message: AgentMessage = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool123',
            content: longResult
          }
        ]
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('...');
  });

  it('should not render empty user messages', () => {
    const message: AgentMessage = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: ''
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(0);
  });

  it('should not render whitespace-only user messages', () => {
    const message: AgentMessage = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: '   \n\t  '
      }
    };

    const result = formatMessageCompact(message);

    expect(result).toHaveLength(0);
  });

  it('should not contain double-width emojis that cause OpenTUI layout issues', () => {
    const message: AgentMessage = {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'Analyzing the problem' },
          { type: 'text', text: 'Here is the solution' },
          { type: 'tool_use', id: '1', name: 'Read', input: { file: 'test.ts' } },
          { type: 'tool_result', tool_use_id: '1', content: 'file contents', is_error: false }
        ]
      }
    };

    const result = formatMessageCompact(message);

    // Check that no double-width emojis are present
    // These emojis cause OpenTUI to miscalculate text width, leading to garbled rendering
    const problematicEmojis = ['👤', '💭', '📝', '🔧', '✗', '✓', '→'];

    for (const line of result) {
      for (const emoji of problematicEmojis) {
        expect(line, `Line should not contain emoji ${emoji} to prevent layout issues: "${line}"`).not.toContain(emoji);
      }
    }
  });
});
