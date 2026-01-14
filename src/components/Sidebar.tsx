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
      <Text bold>Agents</Text>
      <Box height={1} />
      {sortedAgents.length === 0 && (
        <Text dimColor>No agents found</Text>
      )}
      {sortedAgents.map(agent => {
        const isSelected = agent.agentId === selectedId;
        const indicator = agent.isLive ? '●' : '○';
        const status = agent.isLive ? '(live)' : '(completed)';

        return (
          <Box key={agent.agentId} flexDirection="column">
            <Text
              color={isSelected ? 'black' : undefined}
              backgroundColor={isSelected ? 'white' : undefined}
            >
              {indicator} {agent.slug}
            </Text>
            <Text dimColor>  {status}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
