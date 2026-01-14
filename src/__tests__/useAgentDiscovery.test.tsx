import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { useAgentDiscovery } from '../hooks/useAgentDiscovery.js';
import React, { useEffect } from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { AgentInfo } from '../lib/agentDiscovery.js';

// Helper to store hook results for testing
let testResults: AgentInfo[] | null = null;

// Helper component to test the hook
function TestComponent({ subagentsDir }: { subagentsDir: string | null }) {
  const agents = useAgentDiscovery(subagentsDir);

  useEffect(() => {
    testResults = agents;
  }, [agents]);

  return (
    <Text>
      Agents: {agents.length}
    </Text>
  );
}

describe('useAgentDiscovery', () => {
  const testDir = path.join('/tmp', 'useAgentDiscovery-test');

  beforeEach(async () => {
    // Create test directory
    await fs.promises.mkdir(testDir, { recursive: true });
    testResults = null;
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  it('should return empty array when no subagents directory provided', () => {
    render(<TestComponent subagentsDir={null} />);

    expect(testResults).not.toBeNull();
    expect(testResults).toEqual([]);
  });

  it('should discover agents in the directory', async () => {
    // Create a test agent file
    const agentFile = path.join(testDir, 'agent-abc123.jsonl');
    const message = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'test' }]
      }
    };
    await fs.promises.writeFile(agentFile, JSON.stringify(message));

    render(<TestComponent subagentsDir={testDir} />);

    // Give it time to discover
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(testResults).not.toBeNull();
    expect(testResults!).toHaveLength(1);
    expect(testResults![0].agentId).toBe('abc123');
  });

  it('should detect new agents when they are added', async () => {
    render(<TestComponent subagentsDir={testDir} />);

    // Initially empty
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(testResults!).toHaveLength(0);

    // Add a new agent file
    const agentFile = path.join(testDir, 'agent-abc123.jsonl');
    const message = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'test' }]
      }
    };
    await fs.promises.writeFile(agentFile, JSON.stringify(message));

    // Wait for file watcher to detect the change
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(testResults!).toHaveLength(1);
    expect(testResults![0].agentId).toBe('abc123');
  });

  it('should update isLive status periodically without fs events', async () => {
    // Create an agent file with recent mtime (live)
    const agentFile = path.join(testDir, 'agent-abc123.jsonl');
    const message = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'test' }]
      }
    };
    await fs.promises.writeFile(agentFile, JSON.stringify(message));

    render(<TestComponent subagentsDir={testDir} />);

    // Give it time to discover
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(testResults!).toHaveLength(1);
    // Should be live (just created)
    expect(testResults![0].isLive).toBe(true);

    // Manually change mtime WITHOUT triggering fs.watch
    // (simulates time passing without file changes)
    const tenSecondsAgo = Date.now() / 1000 - 10;
    await fs.promises.utimes(agentFile, tenSecondsAgo, tenSecondsAgo);

    // NOTE: We don't touch/modify the file, so fs.watch won't fire
    // The hook should poll periodically and detect the stale mtime

    // Wait for periodic status check to run (should check every 2-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Status should now be updated to not live via periodic polling
    expect(testResults![0].isLive).toBe(false);
  });

  it('should continue updating isLive status when file becomes live again', async () => {
    // Create an agent file with old mtime (not live)
    const agentFile = path.join(testDir, 'agent-abc123.jsonl');
    const message = {
      type: 'user',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'test' }]
      }
    };
    await fs.promises.writeFile(agentFile, JSON.stringify(message));

    // Set mtime to 10 seconds ago
    const tenSecondsAgo = Date.now() / 1000 - 10;
    await fs.promises.utimes(agentFile, tenSecondsAgo, tenSecondsAgo);

    render(<TestComponent subagentsDir={testDir} />);

    // Give it time to discover
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(testResults!).toHaveLength(1);
    expect(testResults![0].isLive).toBe(false);

    // Touch the file to make it live
    const now = new Date();
    await fs.promises.utimes(agentFile, now, now);

    // Wait for periodic status check
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Should now be live
    expect(testResults![0].isLive).toBe(true);
  });

  it('should handle multiple agents and update their status independently', async () => {
    // Create two agent files
    const agent1File = path.join(testDir, 'agent-abc123.jsonl');
    const agent2File = path.join(testDir, 'agent-def456.jsonl');

    const message1 = {
      type: 'user',
      agentId: 'abc123',
      slug: 'agent-1',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'test1' }]
      }
    };

    const message2 = {
      type: 'user',
      agentId: 'def456',
      slug: 'agent-2',
      timestamp: '2026-01-14T17:01:00.000Z',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'test2' }]
      }
    };

    await fs.promises.writeFile(agent1File, JSON.stringify(message1));
    await fs.promises.writeFile(agent2File, JSON.stringify(message2));

    // Make agent1 old, keep agent2 fresh
    const tenSecondsAgo = Date.now() / 1000 - 10;
    await fs.promises.utimes(agent1File, tenSecondsAgo, tenSecondsAgo);

    render(<TestComponent subagentsDir={testDir} />);

    // Give it time to discover
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(testResults!).toHaveLength(2);

    const agent1 = testResults!.find(a => a.agentId === 'abc123');
    const agent2 = testResults!.find(a => a.agentId === 'def456');

    expect(agent1!.isLive).toBe(false);
    expect(agent2!.isLive).toBe(true);
  });
});
