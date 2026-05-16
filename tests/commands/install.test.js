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
  writeStatuslineConfig: vi.fn(),
  STATUSLINE_SCRIPT_PATH: '/home/testuser/.claude/claude-statusline.sh',
  STATUSLINE_CONFIG_PATH: '/home/testuser/.claude/statusline-config.json',
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

vi.mock('../../src/ui/prompts.js', () => ({
  runInteractiveSetup: vi.fn(),
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
  writeStatuslineConfig,
  STATUSLINE_SCRIPT_PATH,
  STATUSLINE_CONFIG_PATH,
  SETTINGS_PATH,
} from '../../src/utils/config.js';
import { checkAllDependencies, printDependencyStatus } from '../../src/utils/dependency.js';
import { isWindows, getScriptName } from '../../src/utils/platform.js';
import { runInteractiveSetup } from '../../src/ui/prompts.js';
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
    writeStatuslineConfig.mockReturnValue(true);
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
    it('should install successfully on Unix', async () => {
      await install({});

      expect(consoleLogSpy).toHaveBeenCalledWith('Claude Statusline Installer\n');
      expect(checkAllDependencies).toHaveBeenCalled();
      expect(printDependencyStatus).toHaveBeenCalled();
      expect(ensureClaudeDir).toHaveBeenCalled();
      expect(copyStatuslineScript).toHaveBeenCalled();
      expect(writeStatuslineConfig).toHaveBeenCalled();
      expect(writeSettings).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('\n✓ Installation complete!');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nRestart Claude Code to apply changes.');
    });

    it('should exit with error if jq is missing on Unix', async () => {
      checkAllDependencies.mockReturnValue({ jq: false, python3: true, git: true });

      await expect(install({})).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n✗ Error: jq is required but not installed.');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Install with: brew install jq (macOS) or apt install jq (Ubuntu)');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should not require jq on Windows', async () => {
      isWindows.mockReturnValue(true);
      platform.mockReturnValue('win32');
      getScriptName.mockReturnValue('claude-statusline.ps1');
      checkAllDependencies.mockReturnValue({ jq: true, python3: true, git: true });

      await install({});

      expect(processExitSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('\n✓ Installation complete!');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nNote: The PowerShell script runs with -ExecutionPolicy Bypass.');
    });

    it('should warn if python3 is missing on Unix', async () => {
      checkAllDependencies.mockReturnValue({ jq: true, python3: false, git: true });

      await install({});

      expect(consoleWarnSpy).toHaveBeenCalledWith('\n⚠ Warning: python3 is not installed. Relative path calculation may not work correctly.');
    });

    it('should warn if python is missing on Windows', async () => {
      isWindows.mockReturnValue(true);
      platform.mockReturnValue('win32');
      getScriptName.mockReturnValue('claude-statusline.ps1');
      checkAllDependencies.mockReturnValue({ jq: true, python3: false, git: true });

      await install({});

      expect(consoleWarnSpy).toHaveBeenCalledWith('\n⚠ Warning: python is not installed. Using PowerShell built-in path functions.');
    });

    it('should exit if installation exists without --force', async () => {
      scriptExists.mockReturnValue(true);

      await expect(install({})).rejects.toThrow('process.exit called');

      expect(consoleLogSpy).toHaveBeenCalledWith('\n⚠ Existing installation detected:');
      expect(consoleLogSpy).toHaveBeenCalledWith(`  - Script: ${STATUSLINE_SCRIPT_PATH}`);
      expect(consoleLogSpy).toHaveBeenCalledWith('\nUse --force to overwrite or --backup to backup existing files.');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit if config exists without --force', async () => {
      hasStatusLineConfig.mockReturnValue(true);

      await expect(install({})).rejects.toThrow('process.exit called');

      expect(consoleLogSpy).toHaveBeenCalledWith(`  - Config in: ${SETTINGS_PATH}`);
    });

    it('should proceed with --force option', async () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);

      await install({ force: true });

      expect(ensureClaudeDir).toHaveBeenCalled();
      expect(copyStatuslineScript).toHaveBeenCalled();
      expect(writeSettings).toHaveBeenCalled();
    });

    it('should backup files with --backup option', async () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      backupFile.mockReturnValue('/backup/path');

      await install({ force: true, backup: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\nBacking up existing files...');
      expect(backupFile).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
      expect(backupFile).toHaveBeenCalledWith(SETTINGS_PATH);
      expect(consoleLogSpy).toHaveBeenCalledWith('  ✓ Script backed up to: /backup/path');
      expect(consoleLogSpy).toHaveBeenCalledWith('  ✓ Settings backed up to: /backup/path');
    });

    it('should not log backup message if backup returns null', async () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(true);
      backupFile.mockReturnValue(null);

      await install({ force: true, backup: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\nBacking up existing files...');
      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      expect(calls).not.toContain(expect.stringContaining('backed up to'));
    });

    it('should not backup script if script does not exist', async () => {
      scriptExists.mockReturnValue(false);
      hasStatusLineConfig.mockReturnValue(true);
      backupFile.mockReturnValue('/backup/path');

      await install({ force: true, backup: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\nBacking up existing files...');
      expect(backupFile).not.toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
      expect(backupFile).toHaveBeenCalledWith(SETTINGS_PATH);
    });

    it('should not backup config if config does not exist', async () => {
      scriptExists.mockReturnValue(true);
      hasStatusLineConfig.mockReturnValue(false);
      backupFile.mockReturnValue('/backup/path');

      await install({ force: true, backup: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\nBacking up existing files...');
      expect(backupFile).toHaveBeenCalledWith(STATUSLINE_SCRIPT_PATH);
      expect(backupFile).not.toHaveBeenCalledWith(SETTINGS_PATH);
    });

    it('should exit if copyStatuslineScript fails', async () => {
      copyStatuslineScript.mockReturnValue(false);

      await expect(install({})).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('  ✗ Failed to copy claude-statusline.sh');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit if writeStatuslineConfig fails', async () => {
      writeStatuslineConfig.mockReturnValue(false);

      await expect(install({})).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('  ✗ Failed to save statusline config');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit if writeSettings fails', async () => {
      writeStatuslineConfig.mockReturnValue(true);
      writeSettings.mockReturnValue(false);

      await expect(install({})).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('  ✗ Failed to update settings.json');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should run interactive setup when --interactive is passed', async () => {
      const customLayout = {
        line1: ['model', 'ctx'],
        line2: ['dir', 'git'],
        line3: ['sid'],
      };
      runInteractiveSetup.mockResolvedValue({ layout: customLayout, compact: false });

      await install({ interactive: true });

      expect(runInteractiveSetup).toHaveBeenCalled();
      expect(writeStatuslineConfig).toHaveBeenCalledWith(
        expect.objectContaining({ layout: customLayout, compact: false })
      );
    });

    it('should persist compact flag returned from interactive setup', async () => {
      const compactLayout = {
        line1: ['ctx', 'proj', 'model', 'used'],
        line2: [],
        line3: [],
      };
      runInteractiveSetup.mockResolvedValue({ layout: compactLayout, compact: true });

      await install({ interactive: true });

      expect(writeStatuslineConfig).toHaveBeenCalledWith(
        expect.objectContaining({ layout: compactLayout, compact: true })
      );
    });

    it('should use default layout when --default overrides --interactive', async () => {
      await install({ interactive: true, default: true });

      expect(runInteractiveSetup).not.toHaveBeenCalled();
    });

    it('should fallback to default layout when interactive setup is cancelled', async () => {
      runInteractiveSetup.mockRejectedValue(new Error('User cancelled'));

      await install({ interactive: true });

      expect(consoleWarnSpy).toHaveBeenCalledWith('\n⚠ Interactive setup cancelled. Using default layout.');
      expect(writeStatuslineConfig).toHaveBeenCalled();
    });

    it('should install compact preset when --compact is passed', async () => {
      await install({ compact: true });

      expect(runInteractiveSetup).not.toHaveBeenCalled();
      expect(writeStatuslineConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          compact: true,
          layout: expect.objectContaining({
            line1: ['ctx', 'proj', 'model', 'fast', 'used'],
            line2: [],
            line3: [],
          }),
        })
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('\nMode: Compact (single-line)');
    });

    it('should let --default override --compact', async () => {
      await install({ compact: true, default: true });

      expect(writeStatuslineConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          compact: false,
          layout: expect.objectContaining({
            line1: ['dir', 'git', 'worktree'],
          }),
        })
      );
    });

    it('should log layout info after installation', async () => {
      await install({});

      expect(consoleLogSpy).toHaveBeenCalledWith('\nMode: Multi-line');
      expect(consoleLogSpy).toHaveBeenCalledWith('Layout:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Line 1: dir, git, worktree');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Line 2: model, fast, ctx, used, lines');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Line 3: sid, style, msg');
    });

    it('should save layout config to statusline-config.json', async () => {
      await install({});

      expect(consoleLogSpy).toHaveBeenCalledWith(`  ✓ Saved layout config to ${STATUSLINE_CONFIG_PATH}`);
    });

    it('should not log empty layout lines', async () => {
      const customLayout = {
        line1: [],
        line2: [],
        line3: ['sid'],
      };
      runInteractiveSetup.mockResolvedValue({ layout: customLayout, compact: false });

      await install({ interactive: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('  Line 3: sid');
      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      expect(calls).not.toContain(expect.stringContaining('Line 1:'));
      expect(calls).not.toContain(expect.stringContaining('Line 2:'));
    });

    it('should handle all lines empty', async () => {
      const customLayout = {
        line1: [],
        line2: [],
        line3: [],
      };
      runInteractiveSetup.mockResolvedValue({ layout: customLayout, compact: false });

      await install({ interactive: true });

      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      expect(calls).not.toContain(expect.stringContaining('Line 1:'));
      expect(calls).not.toContain(expect.stringContaining('Line 2:'));
      expect(calls).not.toContain(expect.stringContaining('Line 3:'));
    });
  });
});
