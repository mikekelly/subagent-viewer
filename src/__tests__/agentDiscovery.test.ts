import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { discoverAgents, AgentInfo } from '../lib/agentDiscovery.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('agentDiscovery', () => {
  const tmpDir = path.join(os.tmpdir(), 'agent-discovery-test-' + Date.now());

  beforeEach(async () => {
    await fs.promises.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  describe('discoverAgents', () => {
    it('should return empty array when directory is empty', async () => {
      const agents = await discoverAgents(tmpDir);
      expect(agents).toEqual([]);
    });

    it('should discover agent files', async () => {
      // Create a test agent file
      const agentFile = path.join(tmpDir, 'agent-abc123.jsonl');
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

      // Set mtime to 10 seconds ago so it's not live
      const tenSecondsAgo = new Date(Date.now() - 10000);
      await fs.promises.utimes(agentFile, tenSecondsAgo, tenSecondsAgo);

      const agents = await discoverAgents(tmpDir);
      expect(agents).toHaveLength(1);
      expect(agents[0]).toMatchObject({
        agentId: 'abc123',
        slug: 'test-agent',
        filePath: agentFile,
        startTime: '2026-01-14T17:00:00.000Z',
        isLive: false
      });
    });

    it('should mark agents as live if modified within last 5 seconds', async () => {
      const agentFile = path.join(tmpDir, 'agent-abc123.jsonl');
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

      // Touch the file to set recent mtime
      const now = new Date();
      await fs.promises.utimes(agentFile, now, now);

      const agents = await discoverAgents(tmpDir);
      expect(agents).toHaveLength(1);
      expect(agents[0].isLive).toBe(true);
    });

    it('should ignore non-jsonl files', async () => {
      await fs.promises.writeFile(path.join(tmpDir, 'readme.txt'), 'test');
      await fs.promises.writeFile(path.join(tmpDir, 'agent.json'), 'test');

      const agents = await discoverAgents(tmpDir);
      expect(agents).toEqual([]);
    });

    it('should handle multiple agents', async () => {
      const agent1 = {
        type: 'user',
        agentId: 'agent1',
        slug: 'first-agent',
        timestamp: '2026-01-14T17:00:00.000Z',
        message: { role: 'user', content: [] }
      };
      const agent2 = {
        type: 'user',
        agentId: 'agent2',
        slug: 'second-agent',
        timestamp: '2026-01-14T17:01:00.000Z',
        message: { role: 'user', content: [] }
      };

      await fs.promises.writeFile(
        path.join(tmpDir, 'agent-agent1.jsonl'),
        JSON.stringify(agent1)
      );
      await fs.promises.writeFile(
        path.join(tmpDir, 'agent-agent2.jsonl'),
        JSON.stringify(agent2)
      );

      const agents = await discoverAgents(tmpDir);
      expect(agents).toHaveLength(2);
    });

    it('should skip files that cannot be parsed', async () => {
      await fs.promises.writeFile(
        path.join(tmpDir, 'agent-broken.jsonl'),
        'not valid json'
      );

      const agents = await discoverAgents(tmpDir);
      expect(agents).toEqual([]);
    });

    it('should handle non-existent directory', async () => {
      const nonExistent = path.join(tmpDir, 'does-not-exist');
      const agents = await discoverAgents(nonExistent);
      expect(agents).toEqual([]);
    });

    it('should return agents sorted by startTime', async () => {
      // Create agents with different start times
      const agent3 = {
        type: 'user',
        agentId: 'agent3',
        slug: 'third-agent',
        timestamp: '2026-01-14T17:02:00.000Z', // Latest
        message: { role: 'user', content: [] }
      };
      const agent1 = {
        type: 'user',
        agentId: 'agent1',
        slug: 'first-agent',
        timestamp: '2026-01-14T17:00:00.000Z', // Earliest
        message: { role: 'user', content: [] }
      };
      const agent2 = {
        type: 'user',
        agentId: 'agent2',
        slug: 'second-agent',
        timestamp: '2026-01-14T17:01:00.000Z', // Middle
        message: { role: 'user', content: [] }
      };

      // Write files in arbitrary order (agent3, agent1, agent2)
      // to simulate filesystem returning them in random order
      await fs.promises.writeFile(
        path.join(tmpDir, 'agent-agent3.jsonl'),
        JSON.stringify(agent3)
      );
      await fs.promises.writeFile(
        path.join(tmpDir, 'agent-agent1.jsonl'),
        JSON.stringify(agent1)
      );
      await fs.promises.writeFile(
        path.join(tmpDir, 'agent-agent2.jsonl'),
        JSON.stringify(agent2)
      );

      const agents = await discoverAgents(tmpDir);

      // Agents should be sorted by startTime (earliest first)
      expect(agents).toHaveLength(3);
      expect(agents[0].agentId).toBe('agent1');
      expect(agents[1].agentId).toBe('agent2');
      expect(agents[2].agentId).toBe('agent3');
    });
  });
});
