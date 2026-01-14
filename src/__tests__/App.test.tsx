import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../components/App.js';
import { AgentInfo } from '../lib/agentDiscovery.js';
import { AgentMessage } from '../lib/parser.js';
import * as useAgentStreamModule from '../hooks/useAgentStream.js';

// Mock ink module with useStdout
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useStdout: vi.fn(() => ({
      stdout: {
        rows: 30,
        columns: 100,
        write: vi.fn(),
      } as any,
      write: vi.fn(),
    })),
  };
});

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

  const mockMessagesForAgent1: AgentMessage[] = [
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

  beforeEach(() => {
    // Mock useAgentStream hook
    vi.spyOn(useAgentStreamModule, 'useAgentStream').mockImplementation((filePath) => {
      if (filePath === '/path/to/agent-abc123.jsonl') {
        return { messages: mockMessagesForAgent1, isStreaming: true };
      }
      return { messages: [], isStreaming: false };
    });
  });

  it('should render split layout with sidebar and activity stream', () => {
    const { lastFrame } = render(
      <App agents={mockAgents} sessionId="test-session-123" />
    );

    const output = lastFrame();
    expect(output).toContain('Agents'); // Sidebar header
    expect(output).toContain('Activity'); // ActivityStream header
  });

  it('should display agents in sidebar', () => {
    const { lastFrame } = render(
      <App agents={mockAgents} sessionId="test-session-123" />
    );

    const output = lastFrame();
    expect(output).toContain('test-agent-1');
    expect(output).toContain('test-agent-2');
  });

  it('should show activity for selected agent', () => {
    const { lastFrame } = render(
      <App agents={mockAgents} sessionId="test-session-123" />
    );

    const output = lastFrame();
    // First agent should be selected by default
    expect(output).toContain('Message from agent 1');
  });

  it('should select first agent by default', () => {
    const { lastFrame } = render(
      <App agents={mockAgents} sessionId="test-session-123" />
    );

    const output = lastFrame();
    // Check that first agent is highlighted (background color in actual render)
    expect(output).toContain('test-agent-1');
  });

  it('should handle keyboard navigation with arrow down', () => {
    const { lastFrame, stdin } = render(
      <App agents={mockAgents} sessionId="test-session-123" />
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
      <App agents={mockAgents} sessionId="test-session-123" />
    );

    // Simulate arrow up key
    stdin.write('\u001B[A'); // Arrow up escape sequence

    const output = lastFrame();
    // Should still render correctly (might wrap to bottom if at top)
    expect(output).toContain('Agents');
  });

  it('should show empty state when no agents', () => {
    const { lastFrame } = render(
      <App agents={[]} sessionId="test-session-123" />
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
      <App agents={emptyAgents} sessionId="test-session-123" />
    );

    const output = lastFrame();
    expect(output).toContain('empty-agent');
    expect(output).toContain('No activity yet');
  });

  it('should use terminal dimensions to set fixed viewport height', () => {
    const { lastFrame } = render(
      <App agents={mockAgents} sessionId="test-session-123" />
    );

    const output = lastFrame();
    const lines = output.split('\n');

    // The output should fit within the terminal height
    // We expect the UI to be constrained to ~30 lines (mocked terminal rows)
    expect(lines.length).toBeLessThanOrEqual(31); // Allow for some margin
  });
});
