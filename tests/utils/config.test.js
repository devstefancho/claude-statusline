import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  chmodSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/testuser'),
}));

vi.mock('../../src/utils/platform.js', () => ({
  isWindows: vi.fn(() => false),
  getScriptName: vi.fn(() => 'claude-statusline.sh'),
}));

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync } from 'fs';
import { isWindows, getScriptName } from '../../src/utils/platform.js';
import {
  CLAUDE_DIR,
  SETTINGS_PATH,
  STATUSLINE_SCRIPT_PATH,
  STATUSLINE_CONFIG_PATH,
  ensureClaudeDir,
  readSettings,
  writeSettings,
  addStatusLineConfig,
  removeStatusLineConfig,
  copyStatuslineScript,
  backupFile,
  scriptExists,
  hasStatusLineConfig,
  readStatuslineConfig,
  writeStatuslineConfig,
  statuslineConfigExists,
} from '../../src/utils/config.js';

describe('config.js', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Reset platform mocks to default Unix behavior
    isWindows.mockReturnValue(false);
    getScriptName.mockReturnValue('claude-statusline.sh');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constants', () => {
    it('should have correct CLAUDE_DIR', () => {
      expect(CLAUDE_DIR).toBe('/home/testuser/.claude');
    });

    it('should have correct SETTINGS_PATH', () => {
      expect(SETTINGS_PATH).toBe('/home/testuser/.claude/settings.json');
    });

    it('should have correct STATUSLINE_SCRIPT_PATH', () => {
      expect(STATUSLINE_SCRIPT_PATH).toBe('/home/testuser/.claude/claude-statusline.sh');
    });

    it('should have correct STATUSLINE_CONFIG_PATH', () => {
      expect(STATUSLINE_CONFIG_PATH).toBe('/home/testuser/.claude/statusline-config.json');
    });
  });

  describe('ensureClaudeDir()', () => {
    it('should create directory if it does not exist', () => {
      existsSync.mockReturnValue(false);

      ensureClaudeDir();

      expect(mkdirSync).toHaveBeenCalledWith(CLAUDE_DIR, { recursive: true });
      expect(consoleLogSpy).toHaveBeenCalledWith(`Created directory: ${CLAUDE_DIR}`);
    });

    it('should not create directory if it already exists', () => {
      existsSync.mockReturnValue(true);

      ensureClaudeDir();

      expect(mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('readSettings()', () => {
    it('should return empty object if settings file does not exist', () => {
      existsSync.mockReturnValue(false);

      const result = readSettings();

      expect(result).toEqual({});
    });

    it('should return parsed settings if file exists', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{"statusLine": {"type": "command"}}');

      const result = readSettings();

      expect(result).toEqual({ statusLine: { type: 'command' } });
    });

    it('should return empty object and log error on parse error', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('invalid json');

      const result = readSettings();

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should return empty object and log error on read error', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = readSettings();

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error reading settings: Read error');
    });
  });

  describe('writeSettings()', () => {
    it('should write settings and return true', () => {
      writeFileSync.mockImplementation(() => {});

      const result = writeSettings({ test: 'value' });

      expect(result).toBe(true);
      expect(writeFileSync).toHaveBeenCalledWith(
        SETTINGS_PATH,
        JSON.stringify({ test: 'value' }, null, 2)
      );
    });

    it('should return false and log error on write error', () => {
      writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      const result = writeSettings({ test: 'value' });

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error writing settings: Write error');
    });
  });

  describe('addStatusLineConfig()', () => {
    it('should add Unix statusLine config', () => {
      isWindows.mockReturnValue(false);

      const result = addStatusLineConfig({ existing: 'value' });

      expect(result).toEqual({
        existing: 'value',
        statusLine: {
          type: 'command',
          command: '~/.claude/claude-statusline.sh',
        },
      });
    });

    it('should add Windows statusLine config', () => {
      isWindows.mockReturnValue(true);

      const result = addStatusLineConfig({ existing: 'value' });

      expect(result).toEqual({
        existing: 'value',
        statusLine: {
          type: 'command',
          command: 'powershell.exe -ExecutionPolicy Bypass -File "$env:USERPROFILE\\.claude\\claude-statusline.ps1"',
        },
      });
    });
  });

  describe('removeStatusLineConfig()', () => {
    it('should remove statusLine config', () => {
      const result = removeStatusLineConfig({
        statusLine: { type: 'command' },
        other: 'value',
      });

      expect(result).toEqual({ other: 'value' });
    });

    it('should return same object if no statusLine exists', () => {
      const result = removeStatusLineConfig({ other: 'value' });

      expect(result).toEqual({ other: 'value' });
    });
  });

  describe('copyStatuslineScript()', () => {
    it('should copy script and chmod on Unix', () => {
      isWindows.mockReturnValue(false);
      copyFileSync.mockImplementation(() => {});
      chmodSync.mockImplementation(() => {});

      const result = copyStatuslineScript();

      expect(result).toBe(true);
      expect(copyFileSync).toHaveBeenCalled();
      expect(chmodSync).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH, '755');
    });

    it('should copy script without chmod on Windows', () => {
      isWindows.mockReturnValue(true);
      copyFileSync.mockImplementation(() => {});

      const result = copyStatuslineScript();

      expect(result).toBe(true);
      expect(copyFileSync).toHaveBeenCalled();
      expect(chmodSync).not.toHaveBeenCalled();
    });

    it('should return false and log error on copy error', () => {
      copyFileSync.mockImplementation(() => {
        throw new Error('Copy error');
      });

      const result = copyStatuslineScript();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error copying script: Copy error');
    });
  });

  describe('backupFile()', () => {
    it('should return null if file does not exist', () => {
      existsSync.mockReturnValue(false);

      const result = backupFile('/some/path');

      expect(result).toBe(null);
      expect(copyFileSync).not.toHaveBeenCalled();
    });

    it('should backup file and return backup path', () => {
      existsSync.mockReturnValue(true);
      copyFileSync.mockImplementation(() => {});
      const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234567890);

      const result = backupFile('/some/path');

      expect(result).toBe('/some/path.backup.1234567890');
      expect(copyFileSync).toHaveBeenCalledWith('/some/path', '/some/path.backup.1234567890');

      dateNowSpy.mockRestore();
    });

    it('should return null and log error on copy error', () => {
      existsSync.mockReturnValue(true);
      copyFileSync.mockImplementation(() => {
        throw new Error('Backup error');
      });

      const result = backupFile('/some/path');

      expect(result).toBe(null);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error backing up file: Backup error');
    });
  });

  describe('scriptExists()', () => {
    it('should return true if script exists', () => {
      existsSync.mockReturnValue(true);

      const result = scriptExists();

      expect(result).toBe(true);
      expect(existsSync).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
    });

    it('should return false if script does not exist', () => {
      existsSync.mockReturnValue(false);

      const result = scriptExists();

      expect(result).toBe(false);
    });
  });

  describe('hasStatusLineConfig()', () => {
    it('should return true if statusLine config exists', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{"statusLine": {"type": "command"}}');

      const result = hasStatusLineConfig();

      expect(result).toBe(true);
    });

    it('should return false if statusLine config does not exist', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{}');

      const result = hasStatusLineConfig();

      expect(result).toBe(false);
    });

    it('should return false if settings file does not exist', () => {
      existsSync.mockReturnValue(false);

      const result = hasStatusLineConfig();

      expect(result).toBe(false);
    });
  });

  describe('readStatuslineConfig()', () => {
    it('should return null if config file does not exist', () => {
      existsSync.mockReturnValue(false);

      const result = readStatuslineConfig();

      expect(result).toBe(null);
    });

    it('should return parsed config if file exists', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{"version":1,"layout":{"line1":["dir"]}}');

      const result = readStatuslineConfig();

      expect(result).toEqual({ version: 1, layout: { line1: ['dir'] } });
    });

    it('should return null and log error on parse error', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('bad json');

      const result = readStatuslineConfig();

      expect(result).toBe(null);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should return null and log error on read error', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = readStatuslineConfig();

      expect(result).toBe(null);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error reading statusline config: Read error');
    });
  });

  describe('writeStatuslineConfig()', () => {
    it('should write config and return true', () => {
      writeFileSync.mockImplementation(() => {});

      const config = { version: 1, layout: { line1: ['dir'] } };
      const result = writeStatuslineConfig(config);

      expect(result).toBe(true);
      expect(writeFileSync).toHaveBeenCalledWith(
        STATUSLINE_CONFIG_PATH,
        JSON.stringify(config, null, 2)
      );
    });

    it('should return false and log error on write error', () => {
      writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      const result = writeStatuslineConfig({ version: 1 });

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error writing statusline config: Write error');
    });
  });

  describe('statuslineConfigExists()', () => {
    it('should return true if config exists', () => {
      existsSync.mockReturnValue(true);

      const result = statuslineConfigExists();

      expect(result).toBe(true);
    });

    it('should return false if config does not exist', () => {
      existsSync.mockReturnValue(false);

      const result = statuslineConfigExists();

      expect(result).toBe(false);
    });
  });
});
