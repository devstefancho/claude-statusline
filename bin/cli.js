#!/usr/bin/env node

import { Command } from 'commander';
import { install } from '../src/commands/install.js';
import { uninstall } from '../src/commands/uninstall.js';
import { status } from '../src/commands/status.js';
import { formatItemsHelp } from '../src/utils/items.js';

const program = new Command();

program
  .name('claude-statusline')
  .description('Claude Code statusline configuration tool')
  .version('1.0.1');

program
  .command('install')
  .description('Install Claude statusline configuration')
  .option('-f, --force', 'Overwrite existing files')
  .option('-b, --backup', 'Backup existing files before installing')
  .option('-i, --interactive', 'Interactively select preset, items and line layout')
  .option('-c, --compact', 'Install compact single-line preset')
  .option('--default', 'Skip interactive mode, use default (multi-line) layout')
  .addHelpText('after', `
Available statusline items:
${formatItemsHelp()}

Default layout (multi-line):
  Line 1: dir, git, worktree
  Line 2: model, ctx, used, lines
  Line 3: sid, style, msg

Compact layout (single-line):
  Line 1: ctx, proj, model, used

Examples:
  $ claude-statusline install              # Install with default (multi-line) layout
  $ claude-statusline install --compact    # Install compact single-line preset
  $ claude-statusline install -i           # Interactive preset/layout selection
  $ claude-statusline install --force      # Overwrite existing installation`)
  .action(async (opts) => {
    await install(opts);
  });

program
  .command('uninstall')
  .description('Uninstall Claude statusline configuration')
  .option('--keep-script', 'Keep the statusline.sh script file')
  .action(uninstall);

program
  .command('status')
  .description('Check current statusline installation status')
  .action(status);

program.parse();
