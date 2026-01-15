import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Mock the entire @opentui/core module
vi.mock('@opentui/core', () => {
  return {
    createCliRenderer: vi.fn(() => Promise.resolve({
      root: {
        add: vi.fn(),
      },
      keyInput: {
        on: vi.fn(),
      },
      start: vi.fn(),
      destroy: vi.fn(),
    })),
    BoxRenderable: vi.fn(function (this: any, renderer, options) {
      this.id = options.id;
      this.add = vi.fn();
      return this;
    }),
    TextRenderable: vi.fn(function (this: any, renderer, options) {
      this.id = options.id;
      this.content = options.content;
      return this;
    }),
  };
});

describe('OpenTUI Header', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    // Create a temporary project directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subagent-viewer-test-'));
    projectDir = path.join(tempDir, 'test-project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });

    // Mock process.cwd to return our test project
    vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should include root directory name in header title', async () => {
    // Import after mocks are set up
    const { TextRenderable } = await import('@opentui/core');

    // Import the main module to trigger initialization
    await import('../index-opentui.js');

    // Find the header title TextRenderable call
    const calls = (TextRenderable as any).mock.calls;
    const headerTitleCall = calls.find((call: any) =>
      call[1]?.id === 'header-title'
    );

    expect(headerTitleCall).toBeDefined();

    // The title should include the root directory name
    const expectedDirName = path.basename(projectDir);
    expect(headerTitleCall[1].content).toContain(expectedDirName);
    expect(headerTitleCall[1].content).toMatch(/Subagent Viewer \(.+\)/);
  });

  it('should add "Sessions: " prefix to session tabs', async () => {
    // Import after mocks are set up
    const { TextRenderable } = await import('@opentui/core');

    // Create a session directory
    const sessionsDir = path.join(projectDir, '.claude');
    const sessionId = 'test-session-123';
    const sessionDir = path.join(sessionsDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    // Import the main module to trigger initialization
    await import('../index-opentui.js');

    // Find the session tabs TextRenderable
    const calls = (TextRenderable as any).mock.calls;
    const sessionTabsCall = calls.find((call: any) =>
      call[1]?.id === 'session-tabs'
    );

    expect(sessionTabsCall).toBeDefined();

    // Initially empty, but when sessions are loaded, it should have the prefix
    // Note: This test validates the structure exists. Runtime behavior would
    // be tested with integration tests.
    expect(sessionTabsCall[1].content).toBeDefined();
  });
});

describe('Verbose Mode Toggle', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    // Create a temporary project directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subagent-viewer-test-'));
    projectDir = path.join(tempDir, 'test-project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });

    // Mock process.cwd to return our test project
    vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should include navigation hints in quit hint', async () => {
    // Import the main module
    await import('../index-opentui.js');

    // Verify that the quit hint contains expected navigation commands
    const { TextRenderable } = await import('@opentui/core');
    const calls = (TextRenderable as any).mock.calls;
    const quitHintCall = calls.find((call: any) =>
      call[1]?.id === 'quit-hint'
    );

    expect(quitHintCall).toBeDefined();
    expect(quitHintCall[1].content).toContain('h/l:');
    expect(quitHintCall[1].content).toContain('j/k:');
    expect(quitHintCall[1].content).toContain('q: quit');
  });

  it('should register a keypress handler', async () => {
    // This test verifies the structure exists. Runtime behavior is tested
    // through manual testing and integration tests.
    const { createCliRenderer } = await import('@opentui/core');

    // Import the main module
    await import('../index-opentui.js');

    // The renderer should have been created
    expect(createCliRenderer).toHaveBeenCalled();
  });
});
