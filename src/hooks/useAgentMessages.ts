import { useState, useEffect } from 'react';
import * as fs from 'fs';
import { AgentMessage, parseJsonlLine } from '../lib/parser.js';

/**
 * React hook to load messages from an agent's JSONL file.
 * Returns all messages from the file, updating when the file changes.
 */
export function useAgentMessages(filePath: string | null): AgentMessage[] {
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  useEffect(() => {
    if (!filePath) {
      setMessages([]);
      return;
    }

    // Load messages from file
    const loadMessages = () => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const parsed = lines
          .map(line => parseJsonlLine(line))
          .filter((msg): msg is AgentMessage => msg !== null);
        setMessages(parsed);
      } catch {
        // File doesn't exist or can't be read
        setMessages([]);
      }
    };

    loadMessages();

    // Watch for file changes
    try {
      const watcher = fs.watch(filePath, () => {
        loadMessages();
      });

      return () => {
        watcher.close();
      };
    } catch {
      // If watch fails, just do initial load
      return undefined;
    }
  }, [filePath]);

  return messages;
}
