export const ITEMS = [
  { id: 'dir', label: 'Directory', description: 'Current directory relative path', defaultLine: 1 },
  { id: 'git', label: 'Git Status', description: 'Branch, ahead/behind, file changes', defaultLine: 1 },
  { id: 'worktree', label: 'Worktree', description: 'Worktree active indicator (✓/✗)', defaultLine: 1 },
  { id: 'proj', label: 'Project Group', description: 'Combined dir + worktree + git + lines in a bracketed group', defaultLine: 1 },
  { id: 'model', label: 'Model', description: 'Model display name', defaultLine: 2 },
  { id: 'ctx', label: 'Context', description: 'Context window usage progress bar', defaultLine: 2 },
  { id: 'used', label: 'Rate Limits', description: '5h and 7d usage with reset timers', defaultLine: 2 },
  { id: 'lines', label: 'Lines Changed', description: 'Lines added/removed in session', defaultLine: 2 },
  { id: 'sid', label: 'Session ID', description: 'Current session identifier', defaultLine: 3 },
  { id: 'style', label: 'Output Style', description: 'Current output style name', defaultLine: 3 },
  { id: 'msg', label: 'Last Message', description: 'Last user message (truncated)', defaultLine: 3 },
];

export const DEFAULT_LAYOUT = {
  line1: ['dir', 'git', 'worktree'],
  line2: ['model', 'ctx', 'used', 'lines'],
  line3: ['sid', 'style', 'msg'],
};

export const COMPACT_LAYOUT = {
  line1: ['ctx', 'proj', 'model', 'used'],
  line2: [],
  line3: [],
};

export function getItemById(id) {
  return ITEMS.find(item => item.id === id);
}

export function getDefaultItems() {
  return ITEMS.map(item => item.id);
}

export function formatItemsHelp() {
  const maxId = Math.max(...ITEMS.map(i => i.id.length));
  const maxLabel = Math.max(...ITEMS.map(i => i.label.length));
  return ITEMS.map(i =>
    `  ${i.id.padEnd(maxId)}  ${i.label.padEnd(maxLabel)}  ${i.description}`
  ).join('\n');
}
