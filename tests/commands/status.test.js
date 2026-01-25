import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing
vi.mock('../../src/utils/config.js', () => ({
  readSettings: vi.fn(),
  scriptExists: vi.fn(),
  hasStatusLineConfig: vi.fn(),
  STATUSLINE_SCRIPT_PATH: '/home/testuser/.claude/claude-statusline.sh',
  SETTINGS_PATH: '/home/testuser/.claude/settings.json',
}));

vi.mock('../../src/utils/dependency.js', () => ({
  printDependencyStatus: vi.fn(),
}));

import {
  readSettings,
  scriptExists,
  hasStatusLineConfig,
  STATUSLINE_SCRIPT_PATH,
  SETTINGS_PATH,
} from '../../src/utils/config.js';
import { printDependencyStatus } from '../../src/utils/dependency.js';
import { status } from '../../src/commands/status.js';

describe('status.js', () => {
  let consoleLogSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
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
      expect(consoleLogSpy).toHaveBeenCalledWith('  Script file: \u2713 installed');
      expect(consoleLogSpy).toHaveBeenCalledWith(`    Path: ${STATUSLINE_SCRIPT_PATH}`);
      expect(consoleLogSpy).toHaveBeenCalledWith('  Config: \u2713 configured');
      expect(consoleLogSpy).toHaveBeenCalledWith(`    Path: ${SETTINGS_PATH}`);
      expect(consoleLogSpy).toHaveBeenCalledWith('\u2713 Statusline is fully installed and configured.');
    });

    it('should show script and config as not installed', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(false);
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('  Script file: \u2717 not found');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Config: \u2717 not configured');
      expect(consoleLogSpy).toHaveBeenCalledWith('\u2717 Statusline is not installed.');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Run `npx @devstefancho/claude-statusline install` to install.');
    });

    it('should show partially installed when only script exists', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(false);
      printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });

      status();

      expect(consoleLogSpy).toHaveBeenCalledWith('\u26a0 Statusline is partially installed.');
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

      expect(consoleLogSpy).toHaveBeenCalledWith('\u26a0 Statusline is partially installed.');
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
  });
});
