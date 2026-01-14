import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { useAgentStream } from '../hooks/useAgentStream.js';
import React, { useRef, useEffect } from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { AgentMessage } from '../lib/parser.js';

// Helper to store hook results for testing
let testResults: { messages: AgentMessage[]; isStreaming: boolean } | null = null;

// Helper component to test the hook
function TestComponent({ filePath }: { filePath: string | null }) {
  const result = useAgentStream(filePath);

  useEffect(() => {
    testResults = result;
  }, [result]);

  return (
    <Text>
      Messages: {result.messages.length}, Streaming: {result.isStreaming ? 'yes' : 'no'}
    </Text>
  );
}

describe('useAgentStream', () => {
  const testDir = path.join('/tmp', 'useAgentStream-test');
  const testFile = path.join(testDir, 'agent-test.jsonl');

  beforeEach(async () => {
    // Create test directory
    await fs.promises.mkdir(testDir, { recursive: true });
    testResults = null;
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  it('should return empty messages and isStreaming false when no file path provided', () => {
    render(<TestComponent filePath={null} />);

    expect(testResults).not.toBeNull();
    expect(testResults!.messages).toEqual([]);
    expect(testResults!.isStreaming).toBe(false);
  });

  it('should return empty messages when file does not exist', () => {
    render(<TestComponent filePath={testFile} />);

    expect(testResults).not.toBeNull();
    expect(testResults!.messages).toEqual([]);
    expect(testResults!.isStreaming).toBe(false);
  });

  it('should load initial messages from existing file', async () => {
    // Write initial content
    const line1 = JSON.stringify({
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'First message' }]
      }
    });
    await fs.promises.writeFile(testFile, line1 + '\n');

    render(<TestComponent filePath={testFile} />);

    // Give it time to load
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(testResults).not.toBeNull();
    expect(testResults!.messages).toHaveLength(1);
    expect(testResults!.messages[0].agentId).toBe('abc123');
    expect(testResults!.messages[0].message.content[0]).toEqual({
      type: 'text',
      text: 'First message'
    });
  });

  it('should stream new messages when file is appended', async () => {
    // Write initial content
    const line1 = JSON.stringify({
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'First message' }]
      }
    });
    await fs.promises.writeFile(testFile, line1 + '\n');

    render(<TestComponent filePath={testFile} />);

    // Give it time to load
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(testResults!.messages).toHaveLength(1);

    // Append new message
    const line2 = JSON.stringify({
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:01:00.000Z',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Second message' }]
      }
    });
    await fs.promises.appendFile(testFile, line2 + '\n');

    // Wait for the new message to be detected
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(testResults!.messages).toHaveLength(2);
    expect(testResults!.messages[1].message.content[0]).toEqual({
      type: 'text',
      text: 'Second message'
    });
  });

  it('should set isStreaming true when file mtime is recent', async () => {
    // Write a file with recent modification time
    const line1 = JSON.stringify({
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'First message' }]
      }
    });
    await fs.promises.writeFile(testFile, line1 + '\n');

    render(<TestComponent filePath={testFile} />);

    // Give it time to load and check status
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(testResults).not.toBeNull();
    expect(testResults!.messages).toHaveLength(1);
    // File was just written, so should be streaming
    expect(testResults!.isStreaming).toBe(true);
  });

  it('should set isStreaming false when file has not been modified recently', async () => {
    // Write a file and set its mtime to 10 seconds ago
    const line1 = JSON.stringify({
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'First message' }]
      }
    });
    await fs.promises.writeFile(testFile, line1 + '\n');

    // Set mtime to 10 seconds ago
    const tenSecondsAgo = Date.now() / 1000 - 10;
    await fs.promises.utimes(testFile, tenSecondsAgo, tenSecondsAgo);

    render(<TestComponent filePath={testFile} />);

    // Give it time to load and check status
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(testResults).not.toBeNull();
    expect(testResults!.messages).toHaveLength(1);
    expect(testResults!.isStreaming).toBe(false);
  });

  it('should only read new content when file is appended, not re-read entire file', async () => {
    // This test ensures we track file position correctly
    const line1 = JSON.stringify({
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Message 1' }]
      }
    });
    await fs.promises.writeFile(testFile, line1 + '\n');

    render(<TestComponent filePath={testFile} />);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(testResults!.messages).toHaveLength(1);

    // Append multiple messages quickly
    for (let i = 2; i <= 5; i++) {
      const line = JSON.stringify({
        type: 'assistant',
        agentId: 'abc123',
        slug: 'test-agent',
        timestamp: `2026-01-14T17:0${i}:00.000Z`,
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: `Message ${i}` }]
        }
      });
      await fs.promises.appendFile(testFile, line + '\n');
    }

    // Wait for all updates
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(testResults!.messages).toHaveLength(5);

    // Check all messages are present and in order
    for (let i = 0; i < 5; i++) {
      expect(testResults!.messages[i].message.content[0]).toEqual({
        type: 'text',
        text: `Message ${i + 1}`
      });
    }
  });

  it('should handle partial lines correctly', async () => {
    // Write initial complete line
    const line1 = JSON.stringify({
      type: 'assistant',
      agentId: 'abc123',
      slug: 'test-agent',
      timestamp: '2026-01-14T17:00:00.000Z',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'First message' }]
      }
    });
    await fs.promises.writeFile(testFile, line1 + '\n');

    render(<TestComponent filePath={testFile} />);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(testResults!.messages).toHaveLength(1);

    // Append partial line (no newline)
    const partialLine = '{"type":"assistant","agentId":"abc123"';
    await fs.promises.appendFile(testFile, partialLine);

    // Should still have only 1 message (partial line not parsed)
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(testResults!.messages).toHaveLength(1);

    // Complete the line
    const restOfLine =
      ',"slug":"test-agent","timestamp":"2026-01-14T17:01:00.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Second message"}]}}\n';
    await fs.promises.appendFile(testFile, restOfLine);

    await new Promise(resolve => setTimeout(resolve, 200));
    expect(testResults!.messages).toHaveLength(2);
    expect(testResults!.messages[1].message.content[0]).toEqual({
      type: 'text',
      text: 'Second message'
    });
  });
});
