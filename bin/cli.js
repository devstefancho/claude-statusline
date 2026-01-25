#!/usr/bin/env node

import { Command } from 'commander';
import { install } from '../src/commands/install.js';
import { uninstall } from '../src/commands/uninstall.js';
import { status } from '../src/commands/status.js';

const program = new Command();

program
  .name('claude-statusline')
  .description('Claude Code statusline configuration tool')
  .version('1.0.0');

program
  .command('install')
  .description('Install Claude statusline configuration')
  .option('-f, --force', 'Overwrite existing files')
  .option('-b, --backup', 'Backup existing files before installing')
  .action(install);

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
