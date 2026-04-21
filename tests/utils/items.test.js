import { describe, it, expect } from 'vitest';
import { ITEMS, DEFAULT_LAYOUT, COMPACT_LAYOUT, getItemById, getDefaultItems, formatItemsHelp } from '../../src/utils/items.js';

describe('items.js', () => {
  describe('ITEMS', () => {
    it('should have all expected items', () => {
      const ids = ITEMS.map(i => i.id);
      expect(ids).toContain('dir');
      expect(ids).toContain('git');
      expect(ids).toContain('worktree');
      expect(ids).toContain('proj');
      expect(ids).toContain('model');
      expect(ids).toContain('ctx');
      expect(ids).toContain('used');
      expect(ids).toContain('lines');
      expect(ids).toContain('sid');
      expect(ids).toContain('style');
      expect(ids).toContain('msg');
    });

    it('should have required properties for each item', () => {
      for (const item of ITEMS) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('defaultLine');
        expect([1, 2, 3]).toContain(item.defaultLine);
      }
    });
  });

  describe('DEFAULT_LAYOUT', () => {
    it('should have line1, line2, line3', () => {
      expect(DEFAULT_LAYOUT).toHaveProperty('line1');
      expect(DEFAULT_LAYOUT).toHaveProperty('line2');
      expect(DEFAULT_LAYOUT).toHaveProperty('line3');
    });

    it('should have correct default items per line', () => {
      expect(DEFAULT_LAYOUT.line1).toEqual(['dir', 'git', 'worktree']);
      expect(DEFAULT_LAYOUT.line2).toEqual(['model', 'ctx', 'used', 'lines']);
      expect(DEFAULT_LAYOUT.line3).toEqual(['sid', 'style', 'msg']);
    });
  });

  describe('COMPACT_LAYOUT', () => {
    it('should place all items on line1', () => {
      expect(COMPACT_LAYOUT.line1).toEqual(['ctx', 'proj', 'model', 'used']);
      expect(COMPACT_LAYOUT.line2).toEqual([]);
      expect(COMPACT_LAYOUT.line3).toEqual([]);
    });
  });

  describe('getItemById()', () => {
    it('should return the item for a valid id', () => {
      const item = getItemById('dir');
      expect(item).toBeDefined();
      expect(item.id).toBe('dir');
      expect(item.label).toBe('Directory');
    });

    it('should return undefined for an invalid id', () => {
      expect(getItemById('nonexistent')).toBeUndefined();
    });
  });

  describe('getDefaultItems()', () => {
    it('should return all item ids', () => {
      const ids = getDefaultItems();
      expect(ids).toEqual(ITEMS.map(i => i.id));
    });
  });

  describe('formatItemsHelp()', () => {
    it('should return a formatted string with all items', () => {
      const help = formatItemsHelp();
      expect(typeof help).toBe('string');
      for (const item of ITEMS) {
        expect(help).toContain(item.id);
        expect(help).toContain(item.description);
      }
    });

    it('should have one line per item', () => {
      const help = formatItemsHelp();
      const lines = help.split('\n');
      expect(lines.length).toBe(ITEMS.length);
    });
  });
});
