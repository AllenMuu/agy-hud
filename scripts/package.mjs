import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const stageDir = path.join(rootDir, 'stage');
const distArchive = path.join(rootDir, 'agy-hud.tar.gz');

console.log('Packaging agy-hud release archive...');

if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(path.join(stageDir, 'dist'), { recursive: true });
fs.mkdirSync(path.join(stageDir, 'hooks'), { recursive: true });

// Copy essential files
const filesToCopy = [
  'plugin.json',
  'config.example.json',
  'README.md',
  'package.json',
];

for (const file of filesToCopy) {
  if (fs.existsSync(path.join(rootDir, file))) {
    fs.copyFileSync(path.join(rootDir, file), path.join(stageDir, file));
  }
}

// Copy dist and hooks
fs.copyFileSync(
  path.join(rootDir, 'dist', 'agy-hud.js'),
  path.join(stageDir, 'dist', 'agy-hud.js')
);
fs.copyFileSync(
  path.join(rootDir, 'hooks', 'status-line.sh'),
  path.join(stageDir, 'hooks', 'status-line.sh')
);
fs.chmodSync(path.join(stageDir, 'hooks', 'status-line.sh'), 0o755);

// Create tar.gz
execSync(`tar -czf "${distArchive}" -C "${stageDir}" .`, { stdio: 'inherit' });
fs.rmSync(stageDir, { recursive: true, force: true });

console.log(`✓ Packaged successfully: ${distArchive}`);
