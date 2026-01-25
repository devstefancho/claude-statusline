import {
  readSettings,
  scriptExists,
  hasStatusLineConfig,
  STATUSLINE_SCRIPT_PATH,
  SETTINGS_PATH,
} from '../utils/config.js';
import { printDependencyStatus } from '../utils/dependency.js';

export function status() {
  console.log('Claude Statusline Status\n');

  const scriptInstalled = scriptExists();
  const configInstalled = hasStatusLineConfig();

  console.log('Installation Status:');
  console.log(`  Script file: ${scriptInstalled ? '✓ installed' : '✗ not found'}`);
  console.log(`    Path: ${STATUSLINE_SCRIPT_PATH}`);
  console.log(`  Config: ${configInstalled ? '✓ configured' : '✗ not configured'}`);
  console.log(`    Path: ${SETTINGS_PATH}`);

  if (configInstalled) {
    const settings = readSettings();
    console.log(`\nCurrent statusLine setting:`);
    if (typeof settings.statusLine === 'object') {
      console.log(`  type: ${settings.statusLine.type}`);
      console.log(`  command: ${settings.statusLine.command}`);
    } else {
      console.log(`  ${settings.statusLine}`);
    }
  }

  // Check dependencies
  printDependencyStatus();

  // Overall status
  console.log('\n' + '─'.repeat(40));
  if (scriptInstalled && configInstalled) {
    console.log('✓ Statusline is fully installed and configured.');
  } else if (scriptInstalled || configInstalled) {
    console.log('⚠ Statusline is partially installed.');
    console.log('  Run `npx @devstefancho/claude-statusline install --force` to fix.');
  } else {
    console.log('✗ Statusline is not installed.');
    console.log('  Run `npx @devstefancho/claude-statusline install` to install.');
  }
}
