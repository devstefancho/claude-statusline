import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @inquirer/prompts before importing
vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
  input: vi.fn(),
  select: vi.fn(),
}));

import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { promptItemSelection, promptLineAssignment, promptPreset, runInteractiveSetup } from '../../src/ui/prompts.js';
import { ITEMS, DEFAULT_LAYOUT, COMPACT_LAYOUT } from '../../src/utils/items.js';

describe('prompts.js', () => {
  let consoleLogSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('promptItemSelection()', () => {
    it('should return selected items from checkbox', async () => {
      checkbox.mockResolvedValue(['dir', 'git', 'model']);

      const result = await promptItemSelection();

      expect(result).toEqual(['dir', 'git', 'model']);
      expect(checkbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Items to display',
        })
      );
    });

    it('should provide all items as choices', async () => {
      checkbox.mockResolvedValue(['dir']);

      await promptItemSelection();

      const call = checkbox.mock.calls[0][0];
      expect(call.choices.length).toBe(ITEMS.length);
      // All checked by default except opt-in `fable` (macOS-only, unofficial endpoint)
      for (const choice of call.choices) {
        expect(choice.checked).toBe(choice.value !== 'fable');
      }
    });

    it('should return all default items when nothing selected', async () => {
      checkbox.mockResolvedValue([]);

      const result = await promptItemSelection();

      expect(result).toEqual(ITEMS.map(i => i.id));
      expect(consoleLogSpy).toHaveBeenCalledWith('No items selected. Using defaults.');
    });
  });

  describe('promptLineAssignment()', () => {
    it('should return default layout when user confirms default', async () => {
      confirm.mockResolvedValue(true);

      const result = await promptLineAssignment(['dir', 'git', 'model', 'sid']);

      expect(result).toEqual({
        line1: ['dir', 'git'],
        line2: ['model'],
        line3: ['sid'],
      });
      expect(input).not.toHaveBeenCalled();
    });

    it('should ask for line assignment when user declines default', async () => {
      confirm.mockResolvedValue(false);
      input.mockResolvedValueOnce('1')  // dir -> line 1
           .mockResolvedValueOnce('2')  // git -> line 2
           .mockResolvedValueOnce('3'); // sid -> line 3

      const result = await promptLineAssignment(['dir', 'git', 'sid']);

      expect(result).toEqual({
        line1: ['dir'],
        line2: ['git'],
        line3: ['sid'],
      });
      expect(input).toHaveBeenCalledTimes(3);
    });

    it('should use default line for items not in registry', async () => {
      confirm.mockResolvedValue(true);

      // Unknown item should go to line 1 by default
      const result = await promptLineAssignment(['unknown']);

      expect(result).toEqual({
        line1: ['unknown'],
        line2: [],
        line3: [],
      });
    });

    it('should handle custom line assignment for each item', async () => {
      confirm.mockResolvedValue(false);
      input.mockResolvedValueOnce('3')  // dir -> line 3
           .mockResolvedValueOnce('1'); // model -> line 1

      const result = await promptLineAssignment(['dir', 'model']);

      expect(result).toEqual({
        line1: ['model'],
        line2: [],
        line3: ['dir'],
      });
    });

    it('should validate line number input accepts 1, 2, 3', async () => {
      confirm.mockResolvedValue(false);
      input.mockResolvedValueOnce('2');

      await promptLineAssignment(['dir']);

      const call = input.mock.calls[0][0];
      expect(call.validate('1')).toBe(true);
      expect(call.validate('2')).toBe(true);
      expect(call.validate('3')).toBe(true);
      expect(call.validate('0')).toBe('Enter 1, 2, or 3');
      expect(call.validate('4')).toBe('Enter 1, 2, or 3');
      expect(call.validate('abc')).toBe('Enter 1, 2, or 3');
    });

    it('should handle unknown item with empty description in custom mode', async () => {
      confirm.mockResolvedValue(false);
      input.mockResolvedValueOnce('1');

      const result = await promptLineAssignment(['unknown']);

      expect(result.line1).toEqual(['unknown']);
      const call = input.mock.calls[0][0];
      expect(call.message).toContain('unknown');
      expect(call.default).toBe('1'); // default line 1 for unknown
    });
  });

  describe('promptPreset()', () => {
    it('should return the selected preset value', async () => {
      select.mockResolvedValue('compact');
      const result = await promptPreset();
      expect(result).toBe('compact');
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Choose a layout preset' })
      );
    });

    it('should offer compact, default, and custom choices', async () => {
      select.mockResolvedValue('default');
      await promptPreset();
      const call = select.mock.calls[0][0];
      const values = call.choices.map(c => c.value);
      expect(values).toEqual(['compact', 'default', 'custom']);
    });
  });

  describe('runInteractiveSetup()', () => {
    it('should return COMPACT_LAYOUT when compact preset is picked', async () => {
      select.mockResolvedValue('compact');

      const result = await runInteractiveSetup();

      expect(result.layout).toEqual(COMPACT_LAYOUT);
      expect(result.compact).toBe(true);
      expect(checkbox).not.toHaveBeenCalled();
      expect(confirm).not.toHaveBeenCalled();
    });

    it('should return DEFAULT_LAYOUT when default preset is picked', async () => {
      select.mockResolvedValue('default');

      const result = await runInteractiveSetup();

      expect(result.layout).toEqual(DEFAULT_LAYOUT);
      expect(result.compact).toBe(false);
      expect(checkbox).not.toHaveBeenCalled();
      expect(confirm).not.toHaveBeenCalled();
    });

    it('should run item selection then line assignment for custom preset', async () => {
      select.mockResolvedValue('custom');
      checkbox.mockResolvedValue(['dir', 'model']);
      confirm.mockResolvedValue(true);

      const result = await runInteractiveSetup();

      expect(result).toHaveProperty('layout');
      expect(result.compact).toBe(false);
      expect(result.layout).toHaveProperty('line1');
      expect(result.layout).toHaveProperty('line2');
      expect(result.layout).toHaveProperty('line3');
      expect(checkbox).toHaveBeenCalled();
      expect(confirm).toHaveBeenCalled();
    });

    it('should pass selected items to line assignment in custom preset', async () => {
      select.mockResolvedValue('custom');
      checkbox.mockResolvedValue(['sid', 'style', 'msg']);
      confirm.mockResolvedValue(true);

      const result = await runInteractiveSetup();

      // sid, style, msg all have defaultLine 3
      expect(result.layout.line3).toEqual(['sid', 'style', 'msg']);
    });
  });
});
