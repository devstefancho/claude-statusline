import { execSync } from 'child_process';
import { isWindows } from './platform.js';

export function checkDependency(command) {
  try {
    const checkCmd = isWindows ? 'where' : 'which';
    execSync(`${checkCmd} ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function checkAllDependencies() {
  const results = {
    // Windows uses ConvertFrom-Json instead of jq
    jq: isWindows ? true : checkDependency('jq'),
    // Windows uses 'python' command, Unix uses 'python3'
    python3: checkDependency(isWindows ? 'python' : 'python3'),
    git: checkDependency('git'),
  };

  return results;
}

export function printDependencyStatus() {
  const deps = checkAllDependencies();

  console.log('\nDependency Status:');
  if (isWindows) {
    console.log('  jq:      ✓ not required (using PowerShell ConvertFrom-Json)');
  } else {
    console.log(`  jq:      ${deps.jq ? '✓ installed' : '✗ missing (required)'}`);
  }
  console.log(`  python:  ${deps.python3 ? '✓ installed' : '✗ missing (recommended)'}`);
  console.log(`  git:     ${deps.git ? '✓ installed' : '✗ missing (recommended)'}`);

  return deps;
}
