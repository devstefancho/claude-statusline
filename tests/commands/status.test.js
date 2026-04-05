import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing
vi.mock('../../src/utils/config.js', () => ({
  readSettings: vi.fn(),
  scriptExists: vi.fn(),
  hasStatusLineConfig: vi.fn(),
  readStatuslineConfig: vi.fn(),
  statuslineConfigExists: vi.fn(),
  STATUSLINE_SCRIPT_PATH: '/home/testuser/.claude/claude-statusline.sh',
  STATUSLINE_CONFIG_PATH: '/home/testuser/.claude/statusline-config.json',
  SETTINGS_PATH: '/home/testuser/.claude/settings.json',
}));

vi.mock('../../src/utils/dependency.js', () => ({
  printDependencyStatus: vi.fn(),
}));

import {
  readSettings,
  scriptExists,
  hasStatusLineConfig,
  readStatuslineConfig,
  statuslineConfigExists,
  STATUSLINE_SCRIPT_PATH,
  STATUSLINE_CONFIG_PATH,
  SETTINGS_PATH,
} from '../../src/utils/config.js';
import { printDependencyStatus } from '../../src/utils/dependency.js';
import { status } from '../../src/commands/status.js';

describe('status.js', () => {
  let consoleLogSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    statuslineConfigExists.mockReturnValue(false);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('status()', () => {
    it('should show both script and config as installed', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      readSettings.mockReturnValue({
        statusLine: { type: 'command', command: '~/.claude/claude-statusline.sh' }
      });
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('Claude Statusline Status\n');
      expect(consoleLogSpy).toHaveBeenCalledWith('Installation Status:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Script file: ✓ installed');
      expect(consoleLogSpy).toHaveBeenCalledWith(`    Path: ${STATUSLINE_SCRIPT_PATH}`);
      expect(consoleLogSpy).toHaveBeenCalledWith('  Config: ✓ configured');
      expect(consoleLogSpy).toHaveBeenCalledWith(`    Path: ${SETTINGS_PATH}`);
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Statusline is fully installed and configured.');
    });

    it('should show script and config as not installed', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(false);
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('  Script file: ✗ not found');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Config: ✗ not configured');
      expect(consoleLogSpy).toHaveBeenCalledWith('✗ Statusline is not installed.');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Run `npx @devstefancho/claude-statusline install` to install.');
    });

    it('should show partially installed when only script exists', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(false);
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('⚠ Statusline is partially installed.');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Run `npx @devstefancho/claude-statusline install --force` to fix.');
    });

    it('should show partially installed when only config exists', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(true);
      readSettings.mockReturnValue({
        statusLine: { type: 'command', command: '~/.claude/claude-statusline.sh' }
      });
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('⚠ Statusline is partially installed.');
    });

    it('should display statusLine setting when it is an object', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      readSettings.mockReturnValue({
        statusLine: { type: 'command', command: '~/.claude/claude-statusline.sh' }
      });
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('\nCurrent statusLine setting:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  type: command');
      expect(consoleLogSpy).toHaveBeenCalledWith('  command: ~/.claude/claude-statusline.sh');
    });

    it('should display statusLine setting when it is a string', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      readSettings.mockReturnValue({
        statusLine: 'simple string value'
      });
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('\nCurrent statusLine setting:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  simple string value');
    });

    it('should show layout status when layout config exists', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      statuslineConfigExists.mockReturnValue(true);
      readSettings.mockReturnValue({
        statusLine: { type: 'command', command: '~/.claude/claude-statusline.sh' }
      });
      readStatuslineConfig.mockReturnValue({
        version: 1,
        layout: {
          line1: ['dir', 'git'],
          line2: ['model', 'ctx'],
          line3: ['sid'],
        }
      });
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith(`  Layout: ✓ configured`);
      expect(consoleLogSpy).toHaveBeenCalledWith(`    Path: ${STATUSLINE_CONFIG_PATH}`);
      expect(consoleLogSpy).toHaveBeenCalledWith('\nLayout configuration:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Line 1: dir, git');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Line 2: model, ctx');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Line 3: sid');
    });

    it('should show layout as not found when config does not exist', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(false);
      statuslineConfigExists.mockReturnValue(false);
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('  Layout: ✗ not found (using defaults)');
    });

    it('should handle layout config with null return', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      statuslineConfigExists.mockReturnValue(true);
      readSettings.mockReturnValue({
        statusLine: { type: 'command', command: '~/.claude/claude-statusline.sh' }
      });
      readStatuslineConfig.mockReturnValue(null);
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      // Should not throw, just skip layout display
      expect(consoleLogSpy).not.toHaveBeenCalledWith('\nLayout configuration:');
    });

    it('should not show empty layout lines', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      statuslineConfigExists.mockReturnValue(true);
      readSettings.mockReturnValue({
        statusLine: { type: 'command', command: '~/.claude/claude-statusline.sh' }
      });
      readStatuslineConfig.mockReturnValue({
        version: 1,
        layout: {
          line1: [],
          line2: [],
          line3: ['sid'],
        }
      });
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('  Line 3: sid');
      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      expect(calls).not.toContain(expect.stringContaining('Line 1:'));
      expect(calls).not.toContain(expect.stringContaining('Line 2:'));
    });

    it('should handle all layout lines empty', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      statuslineConfigExists.mockReturnValue(true);
      readSettings.mockReturnValue({
        statusLine: { type: 'command', command: '~/.claude/claude-statusline.sh' }
      });
      readStatuslineConfig.mockReturnValue({
        version: 1,
        layout: {
          line1: [],
          line2: [],
          line3: [],
        }
      });
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      expect(calls).not.toContain(expect.stringContaining('Line 1:'));
      expect(calls).not.toContain(expect.stringContaining('Line 2:'));
      expect(calls).not.toContain(expect.stringContaining('Line 3:'));
    });

    it('should handle layout config without layout property', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      statuslineConfigExists.mockReturnValue(true);
      readSettings.mockReturnValue({
        statusLine: { type: 'command', command: '~/.claude/claude-statusline.sh' }
      });
      readStatuslineConfig.mockReturnValue({ version: 1 });
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      // Should not throw, just skip layout display
      expect(consoleLogSpy).not.toHaveBeenCalledWith('\nLayout configuration:');
    });
  });
});
