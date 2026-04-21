import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { ITEMS, DEFAULT_LAYOUT, COMPACT_LAYOUT } from '../utils/items.js';

export async function promptPreset() {
  const choice = await select({
    message: 'Choose a layout preset',
    choices: [
      {
        name: 'Compact     — Single line, essential info only',
        value: 'compact',
        description: 'Example:  45% | [✓ repo/path  main ↑2 ~1  +42/-15] | Opus 4.7 | 60%(2h30m) 20%(3d5h)',
      },
      {
        name: 'Multi-line  — Three lines, includes last message & session id',
        value: 'default',
        description: 'Line 1: dir, git, worktree  |  Line 2: model, ctx, used, lines  |  Line 3: sid, style, msg',
      },
      {
        name: 'Custom      — Pick items and arrange manually',
        value: 'custom',
        description: 'Choose which items to show and assign them to lines 1, 2, or 3',
      },
    ],
  });
  return choice;
}

export async function promptItemSelection() {
  const allItemIds = ITEMS.map(i => i.id);
  const defaultSelected = allItemIds; // all selected by default

  const choices = ITEMS.map(item => ({
    name: `${item.id.padEnd(10)} ${item.description}`,
    value: item.id,
    checked: defaultSelected.includes(item.id),
  }));

  console.log('\nSelect statusline items (space to toggle, "a" to toggle all):');

  const selected = await checkbox({
    message: 'Items to display',
    choices,
    instructions: false,
    loop: false,
  });

  if (selected.length === 0) {
    console.log('No items selected. Using defaults.');
    return allItemIds;
  }

  return selected;
}

export async function promptLineAssignment(selectedItems) {
  console.log('\nAssign each item to a line (1, 2, or 3):');
  console.log('  Default layout:');
  console.log('    Line 1: ' + DEFAULT_LAYOUT.line1.join(', '));
  console.log('    Line 2: ' + DEFAULT_LAYOUT.line2.join(', '));
  console.log('    Line 3: ' + DEFAULT_LAYOUT.line3.join(', '));

  const useDefault = await confirm({
    message: 'Use default line assignment?',
    default: true,
  });

  if (useDefault) {
    return buildDefaultLayout(selectedItems);
  }

  const layout = { line1: [], line2: [], line3: [] };

  for (const itemId of selectedItems) {
    const item = ITEMS.find(i => i.id === itemId);
    const defaultLine = item ? item.defaultLine : 1;

    const lineNum = await input({
      message: `  ${itemId} (${item ? item.description : ''}) → Line`,
      default: String(defaultLine),
      validate: (val) => {
        const n = parseInt(val, 10);
        if (n >= 1 && n <= 3) return true;
        return 'Enter 1, 2, or 3';
      },
    });

    const key = `line${parseInt(lineNum, 10)}`;
    layout[key].push(itemId);
  }

  return layout;
}

function buildDefaultLayout(selectedItems) {
  const layout = { line1: [], line2: [], line3: [] };
  for (const itemId of selectedItems) {
    const item = ITEMS.find(i => i.id === itemId);
    const line = item ? item.defaultLine : 1;
    layout[`line${line}`].push(itemId);
  }
  return layout;
}

export async function runInteractiveSetup() {
  const preset = await promptPreset();
  if (preset === 'compact') {
    return { layout: COMPACT_LAYOUT, compact: true };
  }
  if (preset === 'default') {
    return { layout: DEFAULT_LAYOUT, compact: false };
  }
  const selectedItems = await promptItemSelection();
  const layout = await promptLineAssignment(selectedItems);
  return { layout, compact: false };
}
