import React from 'react';
import { Box, Text } from 'ink';
import { AgentInfo } from '../lib/agentDiscovery.js';

export interface SidebarProps {
  agents: AgentInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Sidebar({ agents, selectedId, onSelect }: SidebarProps) {
  // Sort agents: live first (by start time desc), then completed (by start time desc)
  const sortedAgents = [...agents].sort((a, b) => {
    // Live agents before completed
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;

    // Within same status, newer first
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold>Agents ({sortedAgents.length})</Text>
      <Box height={1} />
      {sortedAgents.length === 0 && (
        <Box flexDirection="column">
          <Text dimColor>Waiting for agents...</Text>
          <Box height={1} />
          <Text dimColor>Subagents will appear here</Text>
          <Text dimColor>when Claude Code creates</Text>
          <Text dimColor>background tasks.</Text>
        </Box>
      )}
      {sortedAgents.map(agent => {
        const isSelected = agent.agentId === selectedId;
        const indicator = agent.isLive ? '●' : '○';
        const status = agent.isLive ? '(live)' : '(completed)';

        // Truncate slug if too long (leave room for indicator and padding)
        // Sidebar width is 30, minus padding and borders leaves ~25 chars
        const maxSlugLength = 22;
        const displaySlug = agent.slug.length > maxSlugLength
          ? agent.slug.substring(0, maxSlugLength - 1) + '…'
          : agent.slug;

        return (
          <Box key={agent.agentId} flexDirection="column">
            <Text
              color={isSelected ? 'black' : undefined}
              backgroundColor={isSelected ? 'white' : undefined}
            >
              {indicator} {displaySlug}
            </Text>
            <Text dimColor>  {status}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
