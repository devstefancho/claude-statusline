import { checkbox, confirm, input } from '@inquirer/prompts';
import { ITEMS, DEFAULT_LAYOUT } from '../utils/items.js';

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
  const selectedItems = await promptItemSelection();
  const layout = await promptLineAssignment(selectedItems);
  return { layout };
}
