import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const files = readdirSync(root).filter(name => name.endsWith('.js')).sort();
if (files.length === 0) throw new Error('No browser scripts found in src/.');
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(root, file)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax checked ${files.length} browser scripts.`);
