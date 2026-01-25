import { platform } from 'os';

export const isWindows = platform() === 'win32';

export function getScriptName() {
  return isWindows ? 'claude-statusline.ps1' : 'claude-statusline.sh';
}
