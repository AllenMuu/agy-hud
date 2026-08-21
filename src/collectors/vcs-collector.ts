import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { VCSState } from '../types/vcs.js';
import { GitStatusConfig } from '../types/config.js';

export function getVCSState(workspaceDir: string, config: GitStatusConfig): VCSState {
  const emptyState: VCSState = {
    type: 'none',
    branch: '',
    isDirty: false,
    ahead: 0,
    behind: 0,
    untracked: 0,
    modified: 0,
    staged: 0,
  };

  if (!config.enabled || !workspaceDir || !fs.existsSync(workspaceDir)) {
    return emptyState;
  }

  // 1. Fast path: check for .jj repository
  const jjDir = path.join(workspaceDir, '.jj');
  if (fs.existsSync(jjDir)) {
    return {
      type: 'jj',
      branch: 'default',
      isDirty: false,
      ahead: 0,
      behind: 0,
      untracked: 0,
      modified: 0,
      staged: 0,
    };
  }

  // 2. Fast path: read .git/HEAD directly without spawning subprocess
  let gitDir = path.join(workspaceDir, '.git');
  let isGit = fs.existsSync(gitDir);

  if (!isGit) {
    // Check if within a git worktree or submodule (.git is a file)
    try {
      if (fs.existsSync(gitDir) && fs.statSync(gitDir).isFile()) {
        const content = fs.readFileSync(gitDir, 'utf-8');
        const match = content.match(/gitdir:\s*(.+)/);
        if (match) {
          gitDir = path.resolve(workspaceDir, match[1].trim());
          isGit = fs.existsSync(gitDir);
        }
      }
    } catch {}
  }

  if (!isGit) {
    return emptyState;
  }

  let branch = '';
  try {
    const headFile = path.join(gitDir, 'HEAD');
    if (fs.existsSync(headFile)) {
      const headContent = fs.readFileSync(headFile, 'utf-8').trim();
      if (headContent.startsWith('ref: refs/heads/')) {
        branch = headContent.replace('ref: refs/heads/', '');
      } else if (headContent.length >= 7) {
        branch = headContent.slice(0, 7); // Detached HEAD SHA
      }
    }
  } catch {}

  let isDirty = false;
  let ahead = 0;
  let behind = 0;
  let untracked = 0;
  let modified = 0;
  let staged = 0;

  // 3. If details (dirty/ahead/behind) are requested, run fast git command with 50ms timeout
  if (config.showDirty || config.showAheadBehind || config.showFileStats) {
    try {
      const statusOutput = execSync('git status --porcelain -b 2>/dev/null', {
        cwd: workspaceDir,
        timeout: 50,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const lines = statusOutput.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.startsWith('## ')) {
          // Branch header, e.g. ## main...origin/main [ahead 1, behind 2]
          const aheadMatch = line.match(/ahead (\d+)/);
          const behindMatch = line.match(/behind (\d+)/);
          if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
          if (behindMatch) behind = parseInt(behindMatch[1], 10);
          if (!branch) {
            const bMatch = line.slice(3).split('...')[0].trim();
            branch = bMatch;
          }
        } else {
          isDirty = true;
          const indexChar = line[0];
          const workChar = line[1];

          if (indexChar === '?' && workChar === '?') {
            untracked++;
          } else {
            if (indexChar !== ' ' && indexChar !== '?') staged++;
            if (workChar !== ' ' && workChar !== '?') modified++;
          }
        }
      }
    } catch {
      // Subprocess failure or timeout; preserve branch read directly from .git/HEAD
    }
  }

  return {
    type: 'git',
    branch: branch || 'HEAD',
    isDirty,
    ahead,
    behind,
    untracked,
    modified,
    staged,
  };
}
