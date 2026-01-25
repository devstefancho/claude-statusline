import { unlinkSync } from 'fs';
import {
  readSettings,
  writeSettings,
  removeStatusLineConfig,
  scriptExists,
  hasStatusLineConfig,
  STATUSLINE_SCRIPT_PATH,
  SETTINGS_PATH,
} from '../utils/config.js';

export function uninstall(options) {
  console.log('Claude Statusline Uninstaller\n');

  const scriptAlreadyExists = scriptExists();
  const configAlreadyExists = hasStatusLineConfig();

  if (!scriptAlreadyExists && !configAlreadyExists) {
    console.log('✓ Nothing to uninstall. Statusline is not installed.');
    return;
  }

  console.log('Uninstalling...');

  // Remove from settings.json
  if (configAlreadyExists) {
    const settings = readSettings();
    const newSettings = removeStatusLineConfig(settings);
    if (writeSettings(newSettings)) {
      console.log(`  ✓ Removed statusLine config from ${SETTINGS_PATH}`);
    } else {
      console.error('  ✗ Failed to update settings.json');
    }
  }

  // Remove script file
  if (scriptAlreadyExists && !options.keepScript) {
    try {
      unlinkSync(STATUSLINE_SCRIPT_PATH);
      console.log(`  ✓ Removed ${STATUSLINE_SCRIPT_PATH}`);
    } catch (error) {
      console.error(`  ✗ Failed to remove script: ${error.message}`);
    }
  } else if (scriptAlreadyExists && options.keepScript) {
    console.log(`  ⚠ Script kept at: ${STATUSLINE_SCRIPT_PATH}`);
  }

  console.log('\n✓ Uninstallation complete!');
  console.log('\nRestart Claude Code to apply changes.');
}
