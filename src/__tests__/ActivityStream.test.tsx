import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ActivityStream } from '../components/ActivityStream.js';
import { AgentMessage } from '../lib/parser.js';

describe('ActivityStream', () => {
  const mockMessages: AgentMessage[] = [
    {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'First message' }
        ]
      }
    },
    {
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:01:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Second message' }
        ]
      }
    }
  ];

  it('should render messages', () => {
    const { lastFrame } = render(
      <ActivityStream messages={mockMessages} isLive={false} />
    );

    const output = lastFrame();
    expect(output).toContain('First message');
    expect(output).toContain('Second message');
  });

  it('should show live indicator when isLive is true', () => {
    const { lastFrame } = render(
      <ActivityStream messages={mockMessages} isLive={true} />
    );

    const output = lastFrame();
    expect(output).toContain('●'); // Live indicator
  });

  it('should not show live indicator when isLive is false', () => {
    const { lastFrame } = render(
      <ActivityStream messages={mockMessages} isLive={false} />
    );

    const output = lastFrame();
    // Live indicator should not appear or should be different
    const lines = lastFrame()!.split('\n');
    const lastLine = lines[lines.length - 1];
    expect(lastLine).not.toContain('● Streaming');
  });

  it('should render empty state when no messages', () => {
    const { lastFrame } = render(
      <ActivityStream messages={[]} isLive={false} />
    );

    const output = lastFrame();
    expect(output).toContain('Activity');
  });

  it('should display all messages in order', () => {
    const { lastFrame } = render(
      <ActivityStream messages={mockMessages} isLive={false} />
    );

    const output = lastFrame();
    const firstIndex = output.indexOf('First message');
    const secondIndex = output.indexOf('Second message');

    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(-1);
    expect(firstIndex).toBeLessThan(secondIndex);
  });

  it('should render multiple content blocks per message', () => {
    const messagesWithTools: AgentMessage[] = [
      {
        type: 'assistant',
        agentId: 'abc123',
        slug: 'test-agent',
        timestamp: '2026-01-14T17:00:00.000Z',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Running command' },
            { type: 'tool_use', id: 'tool1', name: 'Bash', input: { command: 'npm test' } }
          ]
        }
      }
    ];

    const { lastFrame } = render(
      <ActivityStream messages={messagesWithTools} isLive={false} />
    );

    const output = lastFrame();
    expect(output).toContain('Running command');
    expect(output).toContain('Tool: Bash');
  });
});
