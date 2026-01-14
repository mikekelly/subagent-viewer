import { useState, useEffect } from 'react';
import * as fs from 'fs';
import { AgentMessage, parseJsonlLine } from '../lib/parser.js';

/**
 * React hook to stream messages from an agent's JSONL file in real-time.
 * Tracks file position to only read new content when file is appended.
 * Returns messages and streaming status.
 */
export function useAgentStream(
  filePath: string | null
): { messages: AgentMessage[]; isStreaming: boolean } {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  useEffect(() => {
    if (!filePath) {
      setMessages([]);
      setIsStreaming(false);
      return;
    }

    let filePosition = 0;
    let partialLine = '';
    let statusCheckInterval: NodeJS.Timeout | null = null;

    // Check if file is currently being written to
    const checkStreamingStatus = async () => {
      try {
        const stats = await fs.promises.stat(filePath);
        const now = Date.now();
        const isLive = now - stats.mtimeMs < 5000; // Within last 5 seconds
        setIsStreaming(isLive);
      } catch {
        setIsStreaming(false);
      }
    };

    // Load initial messages and set up position
    const loadInitialMessages = async () => {
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const parsed = lines
          .map(line => parseJsonlLine(line))
          .filter((msg): msg is AgentMessage => msg !== null);

        setMessages(parsed);
        filePosition = content.length;

        // Check initial streaming status
        await checkStreamingStatus();
      } catch {
        // File doesn't exist yet
        setMessages([]);
        setIsStreaming(false);
        filePosition = 0;
      }
    };

    // Read new content from file
    const readNewContent = async () => {
      try {
        const stats = await fs.promises.stat(filePath);

        // If file is smaller than our position, it was truncated/replaced
        if (stats.size < filePosition) {
          filePosition = 0;
          partialLine = '';
        }

        // Only read if there's new content
        if (stats.size > filePosition) {
          const fd = await fs.promises.open(filePath, 'r');
          try {
            const bufferSize = stats.size - filePosition;
            const buffer = Buffer.alloc(bufferSize);
            await fd.read(buffer, 0, bufferSize, filePosition);

            const newContent = buffer.toString('utf-8');
            filePosition = stats.size;

            // Combine with any partial line from before
            const contentToProcess = partialLine + newContent;
            const lines = contentToProcess.split('\n');

            // Last line might be incomplete if no trailing newline
            partialLine = lines[lines.length - 1];

            // Parse complete lines (all but the last)
            const completeLines = lines.slice(0, -1);
            const newMessages = completeLines
              .map(line => parseJsonlLine(line))
              .filter((msg): msg is AgentMessage => msg !== null);

            if (newMessages.length > 0) {
              setMessages(prev => [...prev, ...newMessages]);
            }

            // Update streaming status after file change
            await checkStreamingStatus();
          } finally {
            await fd.close();
          }
        }
      } catch {
        // File might not exist yet or error reading
      }
    };

    // Initialize
    loadInitialMessages();

    // Set up file watcher
    let watcher: fs.FSWatcher | null = null;
    try {
      watcher = fs.watch(filePath, async () => {
        await readNewContent();
      });
    } catch {
      // Watch might fail if file doesn't exist yet
    }

    // Set up periodic status check (every 2 seconds)
    statusCheckInterval = setInterval(checkStreamingStatus, 2000);

    return () => {
      if (watcher) {
        watcher.close();
      }
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [filePath]);

  return { messages, isStreaming };
}
