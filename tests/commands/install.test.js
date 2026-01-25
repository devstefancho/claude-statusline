import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock os module
vi.mock('os', () => ({
  platform: vi.fn(() => 'darwin'),
}));

// Mock modules before importing
vi.mock('../../src/utils/config.js', () => ({
  ensureClaudeDir: vi.fn(),
  readSettings: vi.fn(),
  writeSettings: vi.fn(),
  addStatusLineConfig: vi.fn(),
  copyStatuslineScript: vi.fn(),
  backupFile: vi.fn(),
  scriptExists: vi.fn(),
  hasStatusLineConfig: vi.fn(),
  STATUSLINE_SCRIPT_PATH: '/home/testuser/.claude/claude-statusline.sh',
  SETTINGS_PATH: '/home/testuser/.claude/settings.json',
}));

vi.mock('../../src/utils/dependency.js', () => ({
  checkAllDependencies: vi.fn(),
  printDependencyStatus: vi.fn(),
}));

vi.mock('../../src/utils/platform.js', () => ({
  isWindows: vi.fn(),
  getScriptName: vi.fn(),
}));

import { platform } from 'os';
import {
  ensureClaudeDir,
  readSettings,
  writeSettings,
  addStatusLineConfig,
  copyStatuslineScript,
  backupFile,
  scriptExists,
  hasStatusLineConfig,
  STATUSLINE_SCRIPT_PATH,
  SETTINGS_PATH,
} from '../../src/utils/config.js';
import { checkAllDependencies, printDependencyStatus } from '../../src/utils/dependency.js';
import { isWindows, getScriptName } from '../../src/utils/platform.js';
import { install } from '../../src/commands/install.js';

describe('install.js', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Default mocks for successful installation
    platform.mockReturnValue('darwin');
    isWindows.mockReturnValue(false);
    getScriptName.mockReturnValue('claude-statusline.sh');
    checkAllDependencies.mockReturnValue({ jq: true, python3: true, git: true });
    printDependencyStatus.mockReturnValue({ jq: true, python3: true, git: true });
    scriptExists.mockReturnValue(false);
    hasStatusLineConfig.mockReturnValue(false);
    copyStatuslineScript.mockReturnValue(true);
    readSettings.mockReturnValue({});
    addStatusLineConfig.mockReturnValue({ statusLine: { type: 'command' } });
    writeSettings.mockReturnValue(true);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('install()', () => {
    it('should install successfully on Unix', () => {
      install({});

      expect(consoleLogSpy).toHaveBeenCalledWith('Claude Statusline Installer\n');
      expect(checkAllDependencies).toHaveBeenCalled();
      expect(printDependencyStatus).toHaveBeenCalled();
      expect(ensureClaudeDir).toHaveBeenCalled();
      expect(copyStatuslineScript).toHaveBeenCalled();
      expect(writeSettings).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('\n\u2713 Installation complete!');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nRestart Claude Code to apply changes.');
    });

    it('should exit with error if jq is missing on Unix', () => {
      checkAllDependencies.mockReturnValue({ jq: false, python3: true, git: true });

      expect(() => install({})).toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n\u2717 Error: jq is required but not installed.');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Install with: brew install jq (macOS) or apt install jq (Ubuntu)');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should not require jq on Windows', () => {
      isWindows.mockReturnValue(true);
      platform.mockReturnValue('win32');
      getScriptName.mockReturnValue('claude-statusline.ps1');
      checkAllDependencies.mockReturnValue({ jq: true, python3: true, git: true });

      install({});

      expect(processExitSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('\n\u2713 Installation complete!');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nNote: The PowerShell script runs with -ExecutionPolicy Bypass.');
    });

    it('should warn if python3 is missing on Unix', () => {
      checkAllDependencies.mockReturnValue({ jq: true, python3: false, git: true });

      install({});

      expect(consoleWarnSpy).toHaveBeenCalledWith('\n\u26a0 Warning: python3 is not installed. Relative path calculation may not work correctly.');
    });

    it('should warn if python is missing on Windows', () => {
      isWindows.mockReturnValue(true);
      platform.mockReturnValue('win32');
      getScriptName.mockReturnValue('claude-statusline.ps1');
      checkAllDependencies.mockReturnValue({ jq: true, python3: false, git: true });

      install({});

      expect(consoleWarnSpy).toHaveBeenCalledWith('\n\u26a0 Warning: python is not installed. Using PowerShell built-in path functions.');
    });

    it('should exit if installation exists without --force', () => {
      scriptExists.mockReturnValue(true);

      expect(() => install({})).toThrow('process.exit called');

      expect(consoleLogSpy).toHaveBeenCalledWith('\n\u26a0 Existing installation detected:');
      expect(consoleLogSpy).toHaveBeenCalledWith(`  - Script: ${STATUSLINE_SCRIPT_PATH}`);
      expect(consoleLogSpy).toHaveBeenCalledWith('\nUse --force to overwrite or --backup to backup existing files.');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit if config exists without --force', () => {
      hasStatusLineConfig.mockReturnValue(true);

      expect(() => install({})).toThrow('process.exit called');

      expect(consoleLogSpy).toHaveBeenCalledWith(`  - Config in: ${SETTINGS_PATH}`);
    });

    it('should proceed with --force option', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);

      install({ force: true });

      expect(ensureClaudeDir).toHaveBeenCalled();
      expect(copyStatuslineScript).toHaveBeenCalled();
      expect(writeSettings).toHaveBeenCalled();
    });

    it('should backup files with --backup option', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      backupFile.mockReturnValue('/backup/path');

      install({ force: true, backup: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\nBacking up existing files...');
      expect(backupFile).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
      expect(backupFile).toHaveBeenCalledWith(SETTINGS_PATH);
      expect(consoleLogSpy).toHaveBeenCalledWith('  \u2713 Script backed up to: /backup/path');
      expect(consoleLogSpy).toHaveBeenCalledWith('  \u2713 Settings backed up to: /backup/path');
    });

    it('should not log backup message if backup returns null', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      backupFile.mockReturnValue(null);

      install({ force: true, backup: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\nBacking up existing files...');
      // Should not log success messages
      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      expect(calls).not.toContain(expect.stringContaining('backed up to'));
    });

    it('should not backup script if script does not exist', () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(true);
      backupFile.mockReturnValue('/backup/path');

      install({ force: true, backup: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\nBacking up existing files...');
      expect(backupFile).not.toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
      expect(backupFile).toHaveBeenCalledWith(SETTINGS_PATH);
    });

    it('should not backup config if config does not exist', () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(false);
      backupFile.mockReturnValue('/backup/path');

      install({ force: true, backup: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\nBacking up existing files...');
      expect(backupFile).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
      expect(backupFile).not.toHaveBeenCalledWith(SETTINGS_PATH);
    });

    it('should exit if copyStatuslineScript fails', () => {
      copyStatuslineScript.mockReturnValue(false);

      expect(() => install({})).toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('  \u2717 Failed to copy claude-statusline.sh');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit if writeSettings fails', () => {
      writeSettings.mockReturnValue(false);

      expect(() => install({})).toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('  \u2717 Failed to update settings.json');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should log debug info', () => {
      install({});

      expect(consoleLogSpy).toHaveBeenCalledWith('Debug: platform()=darwin, isWindows()=false');
    });
  });
});
