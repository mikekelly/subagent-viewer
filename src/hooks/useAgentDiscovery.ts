import { useState, useEffect } from 'react';
import { discoverAgents, AgentInfo } from '../lib/agentDiscovery.js';
import * as fs from 'fs';

/**
 * React hook to discover and watch agents in a subagents directory.
 * Returns a list of agents and updates when new agents are added or files change.
 */
export function useAgentDiscovery(subagentsDir: string | null): AgentInfo[] {
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  useEffect(() => {
    if (!subagentsDir) {
      setAgents([]);
      return;
    }

    // Initial discovery
    const loadAgents = async () => {
      const discovered = await discoverAgents(subagentsDir);
      setAgents(discovered);
    };

    loadAgents();

    // Watch for changes
    try {
      const watcher = fs.watch(subagentsDir, async () => {
        const discovered = await discoverAgents(subagentsDir);
        setAgents(discovered);
      });

      return () => {
        watcher.close();
      };
    } catch {
      // If watch fails, just do initial discovery
      return undefined;
    }
  }, [subagentsDir]);

  return agents;
}
