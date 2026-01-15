import * as fs from 'fs';
import * as path from 'path';
import { parseJsonlLine } from './parser.js';

export interface AgentInfo {
  agentId: string;
  slug: string;
  filePath: string;
  startTime: string;
  isLive: boolean;
  mtime: number; // File modification time in milliseconds
}

/**
 * Discover all agent files in a directory.
 * Returns metadata for each agent found.
 */
export async function discoverAgents(subagentsDir: string): Promise<AgentInfo[]> {
  try {
    const files = await fs.promises.readdir(subagentsDir);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

    const agents: AgentInfo[] = [];

    for (const file of jsonlFiles) {
      const filePath = path.join(subagentsDir, file);

      try {
        // Read first line to get agent metadata
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const firstLine = content.split('\n')[0];
        const message = parseJsonlLine(firstLine);

        if (!message) {
          continue;
        }

        // Check if file is live (modified within last 5 seconds)
        const stats = await fs.promises.stat(filePath);
        const now = Date.now();
        const isLive = now - stats.mtimeMs < 5000;

        agents.push({
          agentId: message.agentId,
          slug: message.slug,
          filePath,
          startTime: message.timestamp,
          isLive,
          mtime: stats.mtimeMs
        });
      } catch {
        // Skip files that can't be read or parsed
        continue;
      }
    }

    // Sort agents by startTime to ensure consistent order across calls
    // This prevents navigation bugs when periodic refresh reorders the array
    agents.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return agents;
  } catch {
    // Directory doesn't exist or can't be read
    return [];
  }
}
