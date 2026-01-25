import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs module
vi.mock('fs', () => ({
  unlinkSync: vi.fn(),
}));

// Mock modules before importing
vi.mock('../../src/utils/config.js', () => ({
  readSettings: vi.fn(),
  writeSettings: vi.fn(),
  removeStatusLineConfig: vi.fn(),
  scriptExists: vi.fn(),
  hasStatusLineConfig: vi.fn(),
  STATUSLINE_SCRIPT_PATH: '/home/testuser/.claude/claude-statusline.sh',
  SETTINGS_PATH: '/home/testuser/.claude/settings.json',
}));

import { unlinkSync } from 'fs';
import {
  readSettings,
  writeSettings,
  removeStatusLineConfig,
  scriptExists,
  hasStatusLineConfig,
  STATUSLINE_SCRIPT_PATH,
  SETTINGS_PATH,
} from '../../src/utils/config.js';
import { uninstall } from '../../src/commands/uninstall.js';

describe('uninstall.js', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('uninstall()', () => {
    it('should do nothing if nothing is installed', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(false);

      uninstall({});

      expect(consoleLogSpy).toHaveBeenCalledWith('Claude Statusline Uninstaller\n');
      expect(consoleLogSpy).toHaveBeenCalledWith('\u2713 Nothing to uninstall. Statusline is not installed.');
      expect(writeSettings).not.toHaveBeenCalled();
      expect(unlinkSync).not.toHaveBeenCalled();
    });

    it('should remove config and script when both exist', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      readSettings.mockReturnValue({ statusLine: { type: 'command' }, other: 'value' });
      removeStatusLineConfig.mockReturnValue({ other: 'value' });
      writeSettings.mockReturnValue(true);

      uninstall({});

      expect(consoleLogSpy).toHaveBeenCalledWith('Uninstalling...');
      expect(writeSettings).toHaveBeenCalledWith({ other: 'value' });
      expect(consoleLogSpy).toHaveBeenCalledWith(`  \u2713 Removed statusLine config from ${SETTINGS_PATH}`);
      expect(unlinkSync).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
      expect(consoleLogSpy).toHaveBeenCalledWith(`  \u2713 Removed ${STATUSLINE_SCRIPT_PATH}`);
      expect(consoleLogSpy).toHaveBeenCalledWith('\n\u2713 Uninstallation complete!');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nRestart Claude Code to apply changes.');
    });

    it('should only remove config when only config exists', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(true);
      readSettings.mockReturnValue({ statusLine: { type: 'command' } });
      removeStatusLineConfig.mockReturnValue({});
      writeSettings.mockReturnValue(true);

      uninstall({});

      expect(writeSettings).toHaveBeenCalled();
      expect(unlinkSync).not.toHaveBeenCalled();
    });

    it('should only remove script when only script exists', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(false);

      uninstall({});

      expect(writeSettings).not.toHaveBeenCalled();
      expect(unlinkSync).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
    });

    it('should keep script when --keep-script option is used', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      readSettings.mockReturnValue({ statusLine: { type: 'command' } });
      removeStatusLineConfig.mockReturnValue({});
      writeSettings.mockReturnValue(true);

      uninstall({ keepScript: true });

      expect(writeSettings).toHaveBeenCalled();
      expect(unlinkSync).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(`  \u26a0 Script kept at: ${STATUSLINE_SCRIPT_PATH}`);
    });

    it('should log error when writeSettings fails', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(true);
      readSettings.mockReturnValue({ statusLine: { type: 'command' } });
      removeStatusLineConfig.mockReturnValue({});
      writeSettings.mockReturnValue(false);

      uninstall({});

      expect(consoleErrorSpy).toHaveBeenCalledWith('  \u2717 Failed to update settings.json');
    });

    it('should log error when unlinkSync fails', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(false);
      unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      uninstall({});

      expect(consoleErrorSpy).toHaveBeenCalledWith('  \u2717 Failed to remove script: Permission denied');
    });
  });
});
