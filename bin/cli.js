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
  .option('-i, --interactive', 'Interactively select items and line layout')
  .option('--default', 'Skip interactive mode, use default layout')
  .addHelpText('after', `
Available statusline items:
${formatItemsHelp()}

Default layout:
  Line 1: dir, git, worktree
  Line 2: model, ctx, used, lines
  Line 3: sid, style, msg

Examples:
  $ claude-statusline install              # Install with default layout
  $ claude-statusline install -i           # Interactive item & layout selection
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
