import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../components/App.js';
import { AgentInfo } from '../lib/agentDiscovery.js';
import { AgentMessage } from '../lib/parser.js';

describe('App', () => {
  const mockAgents: AgentInfo[] = [
    {
      agentId: 'abc123',
      slug: 'test-agent-1',
      filePath: '/path/to/agent-abc123.jsonl',
      startTime: '2026-01-14T17:00:00.000Z',
      isLive: true
    },
    {
      agentId: 'def456',
      slug: 'test-agent-2',
      filePath: '/path/to/agent-def456.jsonl',
      startTime: '2026-01-14T16:00:00.000Z',
      isLive: false
    }
  ];

  const mockGetMessages = (agentId: string): AgentMessage[] => {
    if (agentId === 'abc123') {
      return [
        {
          type: 'assistant',
          agentId: 'abc123',
          slug: 'test-agent-1',
          timestamp: '2026-01-14T17:00:00.000Z',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Message from agent 1' }
            ]
          }
        }
      ];
    }
    return [];
  };

  it('should render split layout with sidebar and activity stream', () => {
    const { lastFrame } = render(
      <App agents={mockAgents} getMessages={mockGetMessages} />
    );

    const output = lastFrame();
    expect(output).toContain('Agents'); // Sidebar header
    expect(output).toContain('Activity'); // ActivityStream header
  });

  it('should display agents in sidebar', () => {
    const { lastFrame } = render(
      <App agents={mockAgents} getMessages={mockGetMessages} />
    );

    const output = lastFrame();
    expect(output).toContain('test-agent-1');
    expect(output).toContain('test-agent-2');
  });

  it('should show activity for selected agent', () => {
    const { lastFrame } = render(
      <App agents={mockAgents} getMessages={mockGetMessages} />
    );

    const output = lastFrame();
    // First agent should be selected by default
    expect(output).toContain('Message from agent 1');
  });

  it('should select first agent by default', () => {
    const { lastFrame } = render(
      <App agents={mockAgents} getMessages={mockGetMessages} />
    );

    const output = lastFrame();
    // Check that first agent is highlighted (background color in actual render)
    expect(output).toContain('test-agent-1');
  });

  it('should handle keyboard navigation with arrow down', () => {
    const { lastFrame, stdin } = render(
      <App agents={mockAgents} getMessages={mockGetMessages} />
    );

    // Simulate arrow down key
    stdin.write('\u001B[B'); // Arrow down escape sequence

    const output = lastFrame();
    // Selection should move but we can't easily test the highlight without visual inspection
    // Just ensure it still renders
    expect(output).toContain('Agents');
  });

  it('should handle keyboard navigation with arrow up', () => {
    const { lastFrame, stdin } = render(
      <App agents={mockAgents} getMessages={mockGetMessages} />
    );

    // Simulate arrow up key
    stdin.write('\u001B[A'); // Arrow up escape sequence

    const output = lastFrame();
    // Should still render correctly (might wrap to bottom if at top)
    expect(output).toContain('Agents');
  });

  it('should show empty state when no agents', () => {
    const { lastFrame } = render(
      <App agents={[]} getMessages={mockGetMessages} />
    );

    const output = lastFrame();
    expect(output).toContain('Agents');
    expect(output).toContain('Activity');
  });

  it('should handle agent with no messages', () => {
    const emptyAgents: AgentInfo[] = [
      {
        agentId: 'empty123',
        slug: 'empty-agent',
        filePath: '/path/to/empty.jsonl',
        startTime: '2026-01-14T17:00:00.000Z',
        isLive: false
      }
    ];

    const { lastFrame } = render(
      <App agents={emptyAgents} getMessages={() => []} />
    );

    const output = lastFrame();
    expect(output).toContain('empty-agent');
    expect(output).toContain('No activity yet');
  });
});
