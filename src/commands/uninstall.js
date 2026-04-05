import { unlinkSync } from 'fs';
import {
  readSettings,
  writeSettings,
  removeStatusLineConfig,
  scriptExists,
  hasStatusLineConfig,
  statuslineConfigExists,
  STATUSLINE_SCRIPT_PATH,
  STATUSLINE_CONFIG_PATH,
  SETTINGS_PATH,
} from '../utils/config.js';

export function uninstall(options) {
  console.log('Claude Statusline Uninstaller\n');

  const scriptAlreadyExists = scriptExists();
  const configAlreadyExists = hasStatusLineConfig();
  const layoutConfigExists = statuslineConfigExists();

  if (!scriptAlreadyExists && !configAlreadyExists && !layoutConfigExists) {
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

  // Remove layout config file
  if (layoutConfigExists) {
    try {
      unlinkSync(STATUSLINE_CONFIG_PATH);
      console.log(`  ✓ Removed ${STATUSLINE_CONFIG_PATH}`);
    } catch (error) {
      console.error(`  ✗ Failed to remove layout config: ${error.message}`);
    }
  }

  console.log('\n✓ Uninstallation complete!');
  console.log('\nRestart Claude Code to apply changes.');
}
