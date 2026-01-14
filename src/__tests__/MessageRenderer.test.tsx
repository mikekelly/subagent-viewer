import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { MessageRenderer } from '../components/MessageRenderer.js';
import { AgentMessage } from '../lib/parser.js';

describe('MessageRenderer', () => {
  it('should render text content block', () => {
    const message: AgentMessage = {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello world' }
        ]
      }
    };

    const { lastFrame } = render(<MessageRenderer message={message} />);
    const output = lastFrame();

    expect(output).toContain('Hello world');
    expect(output).toContain('17:00:00'); // timestamp
  });

  it('should render tool_use content block', () => {
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

    const { lastFrame } = render(<MessageRenderer message={message} />);
    const output = lastFrame();

    expect(output).toContain('Tool: Bash');
    expect(output).toContain('npm test');
  });

  it('should truncate long tool inputs', () => {
    const longInput = { command: 'x'.repeat(200) };
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
            input: longInput
          }
        ]
      }
    };

    const { lastFrame } = render(<MessageRenderer message={message} />);
    const output = lastFrame();

    expect(output).toContain('...');
  });

  it('should render tool_result content block', () => {
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
            content: 'Command output here'
          }
        ]
      }
    };

    const { lastFrame } = render(<MessageRenderer message={message} />);
    const output = lastFrame();

    expect(output).toContain('Tool result');
    expect(output).toContain('Command output here');
  });

  it('should truncate long tool results', () => {
    const longContent = 'x'.repeat(200);
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
            content: longContent
          }
        ]
      }
    };

    const { lastFrame } = render(<MessageRenderer message={message} />);
    const output = lastFrame();

    expect(output).toContain('...');
  });

  it('should render thinking content block', () => {
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

    const { lastFrame } = render(<MessageRenderer message={message} />);
    const output = lastFrame();

    expect(output).toContain('I should check the file first');
  });

  it('should render multiple content blocks', () => {
    const message: AgentMessage = {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'First text' },
          { type: 'tool_use', id: 'tool1', name: 'Read', input: { file: 'test.txt' } }
        ]
      }
    };

    const { lastFrame } = render(<MessageRenderer message={message} />);
    const output = lastFrame();

    expect(output).toContain('First text');
    expect(output).toContain('Tool: Read');
  });

  it('should format timestamp consistently', () => {
    const message: AgentMessage = {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T12:34:56.789Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Test' }
        ]
      }
    };

    const { lastFrame } = render(<MessageRenderer message={message} />);
    const output = lastFrame();

    expect(output).toMatch(/\d{2}:\d{2}:\d{2}/); // HH:MM:SS format
  });
});
