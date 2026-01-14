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

  it('should respect availableHeight and only show visible messages', () => {
    // Create many messages that would exceed the available height
    const manyMessages: AgentMessage[] = Array.from({ length: 50 }, (_, i) => ({
      type: 'assistant' as const,
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: `Message ${i}` }
        ]
      }
    }));

    const { lastFrame } = render(
      <ActivityStream messages={manyMessages} isLive={false} availableHeight={10} />
    );

    const output = lastFrame();
    const lines = output.split('\n');

    // Should fit within available height (10 lines)
    expect(lines.length).toBeLessThanOrEqual(11);
  });

  it('should show first messages when agent is completed (not live)', () => {
    // Create messages that exceed viewport
    const manyMessages: AgentMessage[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'assistant' as const,
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: `Message ${i}` }
        ]
      }
    }));

    const { lastFrame } = render(
      <ActivityStream messages={manyMessages} isLive={false} availableHeight={10} />
    );

    const output = lastFrame();

    // Should show first messages (scrolled to top)
    expect(output).toContain('Message 0');
    // Should NOT show last messages initially
    expect(output).not.toContain('Message 19');
  });

  it('should show last messages when agent is live', () => {
    // Create messages that exceed viewport
    const manyMessages: AgentMessage[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'assistant' as const,
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: `Message ${i}` }
        ]
      }
    }));

    const { lastFrame } = render(
      <ActivityStream messages={manyMessages} isLive={true} availableHeight={10} />
    );

    const output = lastFrame();

    // Should show "more above" hint since we're scrolled down
    expect(output).toContain('more above');
    // Should NOT show first messages when scrolled to bottom
    expect(output).not.toContain('Message 0');
    // Status bar should show streaming indicator
    expect(output).toContain('Streaming');
  });

  it('should show scroll hints when there is more content', () => {
    const manyMessages: AgentMessage[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'assistant' as const,
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: `Message ${i}` }
        ]
      }
    }));

    const { lastFrame } = render(
      <ActivityStream messages={manyMessages} isLive={false} availableHeight={10} />
    );

    // Initially at top - should show "more below" indicator with keyboard hints
    let output = lastFrame();
    expect(output).toContain('more below');
    expect(output).toContain('j or Page Down');
    expect(output).not.toContain('more above'); // At top, no "more above"
  });

  it('should show more above indicator when scrolled to bottom', () => {
    const manyMessages: AgentMessage[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'assistant' as const,
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: `Message ${i}` }
        ]
      }
    }));

    const { lastFrame } = render(
      <ActivityStream messages={manyMessages} isLive={true} availableHeight={10} />
    );

    // When live, starts at bottom, should show "more above" indicator
    let output = lastFrame();
    expect(output).toContain('more above');
    expect(output).toContain('k or Page Up');
  });
});
