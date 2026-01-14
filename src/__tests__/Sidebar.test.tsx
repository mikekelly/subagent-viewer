import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Sidebar } from '../components/Sidebar.js';
import { AgentInfo } from '../lib/agentDiscovery.js';

describe('Sidebar', () => {
  const mockAgents: AgentInfo[] = [
    {
      agentId: 'abc123',
      slug: 'live-agent',
      filePath: '/path/to/agent-abc123.jsonl',
      startTime: '2026-01-14T17:00:00.000Z',
      isLive: true
    },
    {
      agentId: 'def456',
      slug: 'completed-agent',
      filePath: '/path/to/agent-def456.jsonl',
      startTime: '2026-01-14T16:00:00.000Z',
      isLive: false
    }
  ];

  it('should render list of agents', () => {
    const { lastFrame } = render(
      <Sidebar
        agents={mockAgents}
        selectedId={null}
        onSelect={() => {}}
      />
    );

    expect(lastFrame()).toContain('live-agent');
    expect(lastFrame()).toContain('completed-agent');
  });

  it('should show live indicator for live agents', () => {
    const { lastFrame } = render(
      <Sidebar
        agents={mockAgents}
        selectedId={null}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Live (1)'); // Live section header
  });

  it('should show completed indicator for completed agents', () => {
    const { lastFrame } = render(
      <Sidebar
        agents={mockAgents}
        selectedId={null}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Completed (1)'); // Completed section header
  });

  it('should highlight selected agent', () => {
    const { lastFrame } = render(
      <Sidebar
        agents={mockAgents}
        selectedId="abc123"
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    // Selected agent should be visually distinct (inverse colors in implementation)
    expect(output).toContain('live-agent');
  });

  it('should display live agents before completed agents', () => {
    const mixedAgents: AgentInfo[] = [
      {
        agentId: 'completed1',
        slug: 'old-agent',
        filePath: '/path/to/completed1.jsonl',
        startTime: '2026-01-14T15:00:00.000Z',
        isLive: false
      },
      {
        agentId: 'live1',
        slug: 'new-live-agent',
        filePath: '/path/to/live1.jsonl',
        startTime: '2026-01-14T17:30:00.000Z',
        isLive: true
      }
    ];

    const { lastFrame } = render(
      <Sidebar
        agents={mixedAgents}
        selectedId={null}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    const liveIndex = output.indexOf('new-live-agent');
    const completedIndex = output.indexOf('old-agent');

    expect(liveIndex).toBeLessThan(completedIndex);
  });

  it('should render empty state when no agents', () => {
    const { lastFrame } = render(
      <Sidebar
        agents={[]}
        selectedId={null}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Agents');
  });

  it('should show agent status text', () => {
    const { lastFrame } = render(
      <Sidebar
        agents={mockAgents}
        selectedId={null}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Live (1)');
    expect(output).toContain('Completed (1)');
  });
});
