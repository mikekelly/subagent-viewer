import { describe, it, expect } from 'vitest';
import { parseJsonlLine } from '../lib/parser.js';

describe('parser', () => {
  describe('parseJsonlLine', () => {
    it('should parse a valid user message', () => {
      const line = JSON.stringify({
        type: 'user',
        agentId: 'abc123',
        slug: 'test-agent',
        timestamp: '2026-01-14T17:42:28.489Z',
        message: {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello world' }
          ]
        }
      });

      const result = parseJsonlLine(line);
      expect(result).toEqual({
        type: 'user',
        agentId: 'abc123',
        slug: 'test-agent',
        timestamp: '2026-01-14T17:42:28.489Z',
        message: {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello world' }
          ]
        }
      });
    });

    it('should parse an assistant message with tool_use', () => {
      const line = JSON.stringify({
        type: 'assistant',
        agentId: 'abc123',
        slug: 'test-agent',
        timestamp: '2026-01-14T17:42:28.489Z',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Let me run a command' },
            {
              type: 'tool_use',
              id: 'tool_123',
              name: 'Bash',
              input: { command: 'ls -la' }
            }
          ]
        }
      });

      const result = parseJsonlLine(line);
      expect(result).toBeDefined();
      expect(result?.message.content).toHaveLength(2);
      expect(result?.message.content[1]).toMatchObject({
        type: 'tool_use',
        name: 'Bash'
      });
    });

    it('should parse a message with tool_result', () => {
      const line = JSON.stringify({
        type: 'user',
        agentId: 'abc123',
        slug: 'test-agent',
        timestamp: '2026-01-14T17:42:28.489Z',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool_123',
              content: 'file1.txt\nfile2.txt'
            }
          ]
        }
      });

      const result = parseJsonlLine(line);
      expect(result).toBeDefined();
      expect(result?.message.content[0]).toMatchObject({
        type: 'tool_result',
        tool_use_id: 'tool_123'
      });
    });

    it('should parse a message with thinking', () => {
      const line = JSON.stringify({
        type: 'assistant',
        agentId: 'abc123',
        slug: 'test-agent',
        timestamp: '2026-01-14T17:42:28.489Z',
        message: {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'I need to analyze this...' }
          ]
        }
      });

      const result = parseJsonlLine(line);
      expect(result).toBeDefined();
      expect(result?.message.content[0]).toMatchObject({
        type: 'thinking',
        thinking: 'I need to analyze this...'
      });
    });

    it('should return null for invalid JSON', () => {
      const result = parseJsonlLine('not valid json');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseJsonlLine('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      const result = parseJsonlLine('   \n  ');
      expect(result).toBeNull();
    });
  });
});
