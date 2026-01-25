import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const CLAUDE_DIR = join(homedir(), '.claude');
export const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');
export const STATUSLINE_SCRIPT_PATH = join(CLAUDE_DIR, 'claude-statusline.sh');
export const ASSET_SCRIPT_PATH = join(__dirname, '../../assets/claude-statusline.sh');

export function ensureClaudeDir() {
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
    console.log(`Created directory: ${CLAUDE_DIR}`);
  }
}

export function readSettings() {
  if (!existsSync(SETTINGS_PATH)) {
    return {};
  }
  try {
    const content = readFileSync(SETTINGS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading settings: ${error.message}`);
    return {};
  }
}

export function writeSettings(settings) {
  try {
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing settings: ${error.message}`);
    return false;
  }
}

export function addStatusLineConfig(settings) {
  return {
    ...settings,
    statusLine: {
      type: 'command',
      command: '~/.claude/claude-statusline.sh',
    },
  };
}

export function removeStatusLineConfig(settings) {
  const { statusLine, ...rest } = settings;
  return rest;
}

export function copyStatuslineScript() {
  try {
    copyFileSync(ASSET_SCRIPT_PATH, STATUSLINE_SCRIPT_PATH);
    chmodSync(STATUSLINE_SCRIPT_PATH, '755');
    return true;
  } catch (error) {
    console.error(`Error copying script: ${error.message}`);
    return false;
  }
}

export function backupFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  const backupPath = `${filePath}.backup.${Date.now()}`;
  try {
    copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (error) {
    console.error(`Error backing up file: ${error.message}`);
    return null;
  }
}

export function scriptExists() {
  return existsSync(STATUSLINE_SCRIPT_PATH);
}

export function hasStatusLineConfig() {
  const settings = readSettings();
  return !!settings.statusLine;
}
