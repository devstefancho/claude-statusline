import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock os module before importing platform
vi.mock('os', () => ({
  platform: vi.fn(),
}));

import { platform } from 'os';
import { isWindows, getScriptName } from '../../src/utils/platform.js';

describe('platform.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isWindows()', () => {
    it('should return true on Windows', () => {
      platform.mockReturnValue('win32');
      expect(isWindows()).toBe(true);
    });

    it('should return false on macOS', () => {
      platform.mockReturnValue('darwin');
      expect(isWindows()).toBe(false);
    });

    it('should return false on Linux', () => {
      platform.mockReturnValue('linux');
      expect(isWindows()).toBe(false);
    });
  });

  describe('getScriptName()', () => {
    it('should return .ps1 on Windows', () => {
      platform.mockReturnValue('win32');
      expect(getScriptName()).toBe('claude-statusline.ps1');
    });

    it('should return .sh on macOS', () => {
      platform.mockReturnValue('darwin');
      expect(getScriptName()).toBe('claude-statusline.sh');
    });

    it('should return .sh on Linux', () => {
      platform.mockReturnValue('linux');
      expect(getScriptName()).toBe('claude-statusline.sh');
    });
  });
});
