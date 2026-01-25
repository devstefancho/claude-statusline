import {
  ensureClaudeDir,
  readSettings,
  writeSettings,
  addStatusLineConfig,
  copyStatuslineScript,
  backupFile,
  scriptExists,
  hasStatusLineConfig,
  STATUSLINE_SCRIPT_PATH,
  SETTINGS_PATH,
} from '../utils/config.js';
import { checkAllDependencies, printDependencyStatus } from '../utils/dependency.js';
import { isWindows, getScriptName } from '../utils/platform.js';

export function install(options) {
  console.log('Claude Statusline Installer\n');

  // Check dependencies
  const deps = checkAllDependencies();
  printDependencyStatus();

  // jq is only required on Unix systems
  if (!isWindows && !deps.jq) {
    console.error('\n✗ Error: jq is required but not installed.');
    console.log('  Install with: brew install jq (macOS) or apt install jq (Ubuntu)');
    process.exit(1);
  }

  if (!deps.python3) {
    if (isWindows) {
      console.warn('\n⚠ Warning: python is not installed. Using PowerShell built-in path functions.');
    } else {
      console.warn('\n⚠ Warning: python3 is not installed. Relative path calculation may not work correctly.');
    }
  }

  // Check existing installation
  const scriptAlreadyExists = scriptExists();
  const configAlreadyExists = hasStatusLineConfig();

  if ((scriptAlreadyExists || configAlreadyExists) && !options.force) {
    console.log('\n⚠ Existing installation detected:');
    if (scriptAlreadyExists) console.log(`  - Script: ${STATUSLINE_SCRIPT_PATH}`);
    if (configAlreadyExists) console.log(`  - Config in: ${SETTINGS_PATH}`);
    console.log('\nUse --force to overwrite or --backup to backup existing files.');
    process.exit(1);
  }

  // Backup if requested
  if (options.backup) {
    console.log('\nBacking up existing files...');
    if (scriptAlreadyExists) {
      const backupPath = backupFile(STATUSLINE_SCRIPT_PATH);
      if (backupPath) {
        console.log(`  ✓ Script backed up to: ${backupPath}`);
      }
    }
    if (configAlreadyExists) {
      const backupPath = backupFile(SETTINGS_PATH);
      if (backupPath) {
        console.log(`  ✓ Settings backed up to: ${backupPath}`);
      }
    }
  }

  // Install
  console.log('\nInstalling...');

  // Ensure ~/.claude directory exists
  ensureClaudeDir();

  // Copy statusline script
  const scriptName = getScriptName();
  if (copyStatuslineScript()) {
    console.log(`  ✓ Copied ${scriptName} to ${STATUSLINE_SCRIPT_PATH}`);
  } else {
    console.error(`  ✗ Failed to copy ${scriptName}`);
    process.exit(1);
  }

  // Update settings.json
  const settings = readSettings();
  const newSettings = addStatusLineConfig(settings);
  if (writeSettings(newSettings)) {
    console.log(`  ✓ Updated ${SETTINGS_PATH}`);
  } else {
    console.error('  ✗ Failed to update settings.json');
    process.exit(1);
  }

  console.log('\n✓ Installation complete!');
  console.log('\nRestart Claude Code to apply changes.');

  // Platform-specific notes
  if (isWindows) {
    console.log('\nNote: The PowerShell script runs with -ExecutionPolicy Bypass.');
  }
}
