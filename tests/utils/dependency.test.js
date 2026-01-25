import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('../../src/utils/platform.js', () => ({
  isWindows: vi.fn(),
}));

import { execSync } from 'child_process';
import { isWindows } from '../../src/utils/platform.js';
import { checkDependency, checkAllDependencies, printDependencyStatus } from '../../src/utils/dependency.js';

describe('dependency.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkDependency()', () => {
    it('should return true when command exists on Unix', () => {
      isWindows.mockReturnValue(false);
      execSync.mockReturnValue(Buffer.from('/usr/bin/jq'));

      expect(checkDependency('jq')).toBe(true);
      expect(execSync).toHaveBeenCalledWith('which jq', { stdio: 'pipe' });
    });

    it('should return true when command exists on Windows', () => {
      isWindows.mockReturnValue(true);
      execSync.mockReturnValue(Buffer.from('C:\\Program Files\\jq.exe'));

      expect(checkDependency('jq')).toBe(true);
      expect(execSync).toHaveBeenCalledWith('where jq', { stdio: 'pipe' });
    });

    it('should return false when command does not exist', () => {
      isWindows.mockReturnValue(false);
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      expect(checkDependency('nonexistent')).toBe(false);
    });
  });

  describe('checkAllDependencies()', () => {
    it('should check all dependencies on Unix', () => {
      isWindows.mockReturnValue(false);
      execSync.mockReturnValue(Buffer.from('/usr/bin/cmd'));

      const result = checkAllDependencies();

      expect(result).toEqual({
        jq: true,
        python3: true,
        git: true,
      });
      expect(execSync).toHaveBeenCalledWith('which jq', { stdio: 'pipe' });
      expect(execSync).toHaveBeenCalledWith('which python3', { stdio: 'pipe' });
      expect(execSync).toHaveBeenCalledWith('which git', { stdio: 'pipe' });
    });

    it('should return jq as true on Windows without checking', () => {
      isWindows.mockReturnValue(true);
      execSync.mockReturnValue(Buffer.from('C:\\cmd.exe'));

      const result = checkAllDependencies();

      expect(result.jq).toBe(true);
      // Windows uses 'python' not 'python3'
      expect(execSync).toHaveBeenCalledWith('where python', { stdio: 'pipe' });
      expect(execSync).toHaveBeenCalledWith('where git', { stdio: 'pipe' });
    });

    it('should return false for missing dependencies', () => {
      isWindows.mockReturnValue(false);
      execSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = checkAllDependencies();

      expect(result).toEqual({
        jq: false,
        python3: false,
        git: false,
      });
    });
  });

  describe('printDependencyStatus()', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should print dependency status on Unix with all installed', () => {
      isWindows.mockReturnValue(false);
      execSync.mockReturnValue(Buffer.from('/usr/bin/cmd'));

      const result = printDependencyStatus();

      expect(result).toEqual({
        jq: true,
        python3: true,
        git: true,
      });
      expect(consoleSpy).toHaveBeenCalledWith('\nDependency Status:');
      expect(consoleSpy).toHaveBeenCalledWith('  jq:      \u2713 installed');
      expect(consoleSpy).toHaveBeenCalledWith('  python:  \u2713 installed');
      expect(consoleSpy).toHaveBeenCalledWith('  git:     \u2713 installed');
    });

    it('should print dependency status on Unix with jq missing', () => {
      isWindows.mockReturnValue(false);
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('jq')) {
          throw new Error('not found');
        }
        return Buffer.from('/usr/bin/cmd');
      });

      const result = printDependencyStatus();

      expect(result.jq).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('  jq:      \u2717 missing (required)');
    });

    it('should print dependency status on Windows', () => {
      isWindows.mockReturnValue(true);
      execSync.mockReturnValue(Buffer.from('C:\\cmd.exe'));

      const result = printDependencyStatus();

      expect(result.jq).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('  jq:      \u2713 not required (using PowerShell ConvertFrom-Json)');
    });

    it('should print missing python status', () => {
      isWindows.mockReturnValue(false);
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('python')) {
          throw new Error('not found');
        }
        return Buffer.from('/usr/bin/cmd');
      });

      const result = printDependencyStatus();

      expect(result.python3).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('  python:  \u2717 missing (recommended)');
    });

    it('should print missing git status', () => {
      isWindows.mockReturnValue(false);
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git')) {
          throw new Error('not found');
        }
        return Buffer.from('/usr/bin/cmd');
      });

      const result = printDependencyStatus();

      expect(result.git).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('  git:     \u2717 missing (recommended)');
    });
  });
});
