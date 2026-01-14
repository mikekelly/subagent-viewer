import { useState, useEffect } from 'react';
import { discoverAgents, AgentInfo } from '../lib/agentDiscovery.js';
import * as fs from 'fs';

/**
 * React hook to discover and watch agents in a subagents directory.
 * Returns a list of agents and updates when new agents are added or files change.
 * Periodically polls to update isLive status based on file mtime.
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

    // Watch for new agents or file changes in directory
    let watcher: fs.FSWatcher | null = null;
    try {
      watcher = fs.watch(subagentsDir, async () => {
        const discovered = await discoverAgents(subagentsDir);
        setAgents(discovered);
      });
    } catch {
      // If watch fails, just do initial discovery
    }

    // Set up periodic polling to update isLive status
    // This ensures status updates even without file system events
    const pollInterval = setInterval(async () => {
      const discovered = await discoverAgents(subagentsDir);
      setAgents(discovered);
    }, 3000); // Poll every 3 seconds

    return () => {
      if (watcher) {
        watcher.close();
      }
      clearInterval(pollInterval);
    };
  }, [subagentsDir]);

  return agents;
}
