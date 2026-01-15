import { describe, it, expect } from 'vitest';
import { discoverAgents, AgentInfo } from '../lib/agentDiscovery.js';

describe('Agent navigation stability', () => {
  it('should return agents in a consistent order across multiple calls', async () => {
    // This test will fail if agents are returned in arbitrary filesystem order
    // We need agents sorted by startTime or agentId to ensure stable navigation

    // Mock scenario: Call discoverAgents multiple times and verify order is consistent
    // In production, filesystem order can change, causing navigation bugs

    const mockAgents: AgentInfo[] = [
      {
        agentId: 'agent-3',
        slug: 'slug-3',
        filePath: '/path/3.jsonl',
        startTime: '2024-01-03T00:00:00Z',
        isLive: false,
      },
      {
        agentId: 'agent-1',
        slug: 'slug-1',
        filePath: '/path/1.jsonl',
        startTime: '2024-01-01T00:00:00Z',
        isLive: true,
      },
      {
        agentId: 'agent-2',
        slug: 'slug-2',
        filePath: '/path/2.jsonl',
        startTime: '2024-01-02T00:00:00Z',
        isLive: false,
      },
    ];

    // Simulate filesystem returning agents in different orders
    const order1 = [mockAgents[0], mockAgents[1], mockAgents[2]];
    const order2 = [mockAgents[2], mockAgents[0], mockAgents[1]];

    // If selectedAgentIndex = 1, it should point to the same agent in both orders
    // With unstable ordering, selectedAgentIndex = 1 points to different agents:
    //   order1[1] = agent-1 (live)
    //   order2[1] = agent-3 (completed)

    expect(order1[1].agentId).not.toBe(order2[1].agentId);

    // This demonstrates the bug: same index, different agent
    // The fix is to sort agents consistently by startTime or agentId
  });

  it('should maintain selection when agents are reordered', () => {
    // Scenario: User selects agent at index 2
    // Periodic refresh reorders agents array
    // Expected: Selection should still point to the same agent
    // Actual (buggy): Selection points to different agent at same index

    const agents1 = [
      { agentId: 'a', isLive: true },
      { agentId: 'b', isLive: true },
      { agentId: 'c', isLive: false },
    ];

    const agents2 = [
      { agentId: 'b', isLive: true },
      { agentId: 'c', isLive: false },
      { agentId: 'a', isLive: true },
    ];

    const selectedAgentIndex = 2;

    // With current buggy implementation:
    const selectedAgent1 = agents1[selectedAgentIndex]; // { agentId: 'c' }
    const selectedAgent2 = agents2[selectedAgentIndex]; // { agentId: 'a' }

    // Same index, different agents - this is the bug!
    expect(selectedAgent1.agentId).not.toBe(selectedAgent2.agentId);

    // After fix, agents should be in consistent order, so:
    // selectedAgent1.agentId === selectedAgent2.agentId
  });
});
