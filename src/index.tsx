import React, { useEffect, useState } from 'react';
import { render, Text, Box } from 'ink';
import { getProjectPath, getClaudeProjectDir, findCurrentSession, getSubagentsDir } from './lib/session.js';
import { useAgentDiscovery } from './hooks/useAgentDiscovery.js';
import { App } from './components/App.js';

function SubagentViewer() {
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

  return <App agents={agents} />;
}

render(<SubagentViewer />);
