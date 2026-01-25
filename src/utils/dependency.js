import { execSync } from 'child_process';

export function checkDependency(command) {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function checkAllDependencies() {
  const results = {
    jq: checkDependency('jq'),
    python3: checkDependency('python3'),
    git: checkDependency('git'),
  };

  return results;
}

export function printDependencyStatus() {
  const deps = checkAllDependencies();

  console.log('\nDependency Status:');
  console.log(`  jq:      ${deps.jq ? '✓ installed' : '✗ missing (required)'}`);
  console.log(`  python3: ${deps.python3 ? '✓ installed' : '✗ missing (recommended)'}`);
  console.log(`  git:     ${deps.git ? '✓ installed' : '✗ missing (recommended)'}`);

  return deps;
}
