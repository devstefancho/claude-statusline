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
  statuslineConfigExists: vi.fn(),
  STATUSLINE_SCRIPT_PATH: '/home/testuser/.claude/claude-statusline.sh',
  STATUSLINE_CONFIG_PATH: '/home/testuser/.claude/statusline-config.json',
  SETTINGS_PATH: '/home/testuser/.claude/settings.json',
}));

import { unlinkSync } from 'fs';
import {
  readSettings,
  writeSettings,
  removeStatusLineConfig,
  scriptExists,
  hasStatusLineConfig,
  statuslineConfigExists,
  STATUSLINE_SCRIPT_PATH,
  STATUSLINE_CONFIG_PATH,
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
      statuslineConfigExists.mockReturnValue(false);

      uninstall({});

      expect(consoleLogSpy).toHaveBeenCalledWith('Claude Statusline Uninstaller\n');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Nothing to uninstall. Statusline is not installed.');
      expect(writeSettings).not.toHaveBeenCalled();
      expect(unlinkSync).not.toHaveBeenCalled();
    });

    it('should remove config, script, and layout config when all exist', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      statuslineConfigExists.mockReturnValue(true);
      readSettings.mockReturnValue({ statusLine: { type: 'command' }, other: 'value' });
      removeStatusLineConfig.mockReturnValue({ other: 'value' });
      writeSettings.mockReturnValue(true);

      uninstall({});

      expect(consoleLogSpy).toHaveBeenCalledWith('Uninstalling...');
      expect(writeSettings).toHaveBeenCalledWith({ other: 'value' });
      expect(consoleLogSpy).toHaveBeenCalledWith(`  ✓ Removed statusLine config from ${SETTINGS_PATH}`);
      expect(unlinkSync).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
      expect(consoleLogSpy).toHaveBeenCalledWith(`  ✓ Removed ${STATUSLINE_SCRIPT_PATH}`);
      expect(unlinkSync).toHaveBeenCalledWith(STATUSLINE_CONFIG_PATH);
      expect(consoleLogSpy).toHaveBeenCalledWith(`  ✓ Removed ${STATUSLINE_CONFIG_PATH}`);
      expect(consoleLogSpy).toHaveBeenCalledWith('\n✓ Uninstallation complete!');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nRestart Claude Code to apply changes.');
    });

    it('should only remove config when only config exists', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(true);
      statuslineConfigExists.mockReturnValue(false);
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
      statuslineConfigExists.mockReturnValue(false);

      uninstall({});

      expect(writeSettings).not.toHaveBeenCalled();
      expect(unlinkSync).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
    });

    it('should keep script when --keep-script option is used', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      statuslineConfigExists.mockReturnValue(false);
      readSettings.mockReturnValue({ statusLine: { type: 'command' } });
      removeStatusLineConfig.mockReturnValue({});
      writeSettings.mockReturnValue(true);

      uninstall({ keepScript: true });

      expect(writeSettings).toHaveBeenCalled();
      expect(unlinkSync).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(`  ⚠ Script kept at: ${STATUSLINE_SCRIPT_PATH}`);
    });

    it('should log error when writeSettings fails', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(true);
      statuslineConfigExists.mockReturnValue(false);
      readSettings.mockReturnValue({ statusLine: { type: 'command' } });
      removeStatusLineConfig.mockReturnValue({});
      writeSettings.mockReturnValue(false);

      uninstall({});

      expect(consoleErrorSpy).toHaveBeenCalledWith('  ✗ Failed to update settings.json');
    });

    it('should log error when unlinkSync fails for script', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(false);
      statuslineConfigExists.mockReturnValue(false);
      unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      uninstall({});

      expect(consoleErrorSpy).toHaveBeenCalledWith('  ✗ Failed to remove script: Permission denied');
    });

    it('should log error when unlinkSync fails for layout config', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(false);
      statuslineConfigExists.mockReturnValue(true);
      unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      uninstall({});

      expect(consoleErrorSpy).toHaveBeenCalledWith('  ✗ Failed to remove layout config: Permission denied');
    });

    it('should remove only layout config when only it exists', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(false);
      statuslineConfigExists.mockReturnValue(true);

      uninstall({});

      expect(writeSettings).not.toHaveBeenCalled();
      expect(unlinkSync).toHaveBeenCalledWith(STATUSLINE_CONFIG_PATH);
    });
  });
});
