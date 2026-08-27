import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getVCSState } from "../src/collectors/vcs-collector.js";
import { GitStatusConfig } from "../src/types/config.js";

describe("VCS Collector", () => {
  const testDir = path.join(os.tmpdir(), "agy-hud-vcs-test-" + Date.now());
  const gitConfig: GitStatusConfig = {
    enabled: true,
    showDirty: false,
    showAheadBehind: false,
    showFileStats: false,
  };

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should return empty state when directory is not a git repository", () => {
    const state = getVCSState(testDir, gitConfig);
    expect(state.type).toBe("none");
    expect(state.branch).toBe("");
  });

  it("should parse branch from regular .git directory", () => {
    const gitDir = path.join(testDir, ".git");
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/feature/awesome-thing\n", "utf-8");

    const state = getVCSState(testDir, gitConfig);
    expect(state.type).toBe("git");
    expect(state.branch).toBe("feature/awesome-thing");
  });

  it("should parse branch from git worktree where .git is a file with gitdir pointer", () => {
    const actualGitDir = path.join(testDir, "actual-git-dir");
    fs.mkdirSync(actualGitDir, { recursive: true });
    fs.writeFileSync(path.join(actualGitDir, "HEAD"), "ref: refs/heads/worktree-branch\n", "utf-8");

    const worktreeDir = path.join(testDir, "worktree");
    fs.mkdirSync(worktreeDir, { recursive: true });
    fs.writeFileSync(path.join(worktreeDir, ".git"), "gitdir: " + actualGitDir + "\n", "utf-8");

    const state = getVCSState(worktreeDir, gitConfig);
    expect(state.type).toBe("git");
    expect(state.branch).toBe("worktree-branch");
  });
});
