import React, { useEffect, useState } from 'react';
import { render, Text, Box } from 'ink';
import { getProjectPath, getClaudeProjectDir, findCurrentSession, getSubagentsDir } from './lib/session.js';
import { useAgentDiscovery } from './hooks/useAgentDiscovery.js';

function App() {
  const [subagentsDir, setSubagentsDir] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const agents = useAgentDiscovery(subagentsDir);

  useEffect(() => {
    const initSession = async () => {
      try {
        const cwd = process.cwd();
        const projectPath = getProjectPath(cwd);
        const projectDir = getClaudeProjectDir(projectPath);
        const sessionId = await findCurrentSession(projectDir);

        if (!sessionId) {
          setError('No active Claude session found for this project');
          return;
        }

        const dir = getSubagentsDir(projectDir, sessionId);
        setSubagentsDir(dir);
      } catch (err) {
        setError(`Error discovering session: ${err}`);
      }
    };

    initSession();
  }, []);

  if (error) {
    return (
      <Box>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (!subagentsDir) {
    return <Text>Discovering session...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold>Subagent Viewer</Text>
      <Text dimColor>Watching: {subagentsDir}</Text>
      <Text>{'\n'}</Text>
      <Text>Found {agents.length} agent(s):</Text>
      {agents.map(agent => (
        <Box key={agent.agentId} marginLeft={2}>
          <Text>
            {agent.isLive ? '🟢' : '⚪'} {agent.slug} ({agent.agentId})
          </Text>
        </Box>
      ))}
    </Box>
  );
}

render(<App />);
