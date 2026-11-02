import { describe, it, expect } from 'vitest';
import { createRepo, runCommand, validatePractice, graphLayout } from './index.js';

describe('Git Simulator Engine', () => {
  it('initializes from scenario', () => {
    const state = createRepo('initialized');
    expect(state.initialized).toBe(true);
    expect(state.HEAD.ref).toBe('main');
  });

  it('runs git init', () => {
    const state = createRepo('empty');
    const res = runCommand(state, 'git init');
    expect(res.state.initialized).toBe(true);
    expect(res.output.some(o => o.includes('repository Git') || o.includes('Initialized'))).toBe(true);
  });

  it('handles add and commit', () => {
    const state = createRepo('initialized');
    const res1 = runCommand(state, 'git add README.md');
    const res2 = runCommand(res1.state, 'git commit -m "initial"');
    expect(Object.keys(res2.state.commits).length).toBe(1);
    expect(res2.output.some(o => o.includes('initial'))).toBe(true);
  });

  it('validates practice goals', () => {
    const state = createRepo('initialized');
    const res1 = runCommand(state, 'git add README.md');
    const res2 = runCommand(res1.state, 'git commit -m "initial"');
    
    const config = {
      checks: [
        { type: 'initialized', label: 'Initialized' },
        { type: 'commit_count', value: 1, label: 'One commit' }
      ]
    };
    
    const validation = validatePractice(res2.state, config);
    expect(validation.passed).toBe(true);
    expect(validation.checks.every(c => c.passed)).toBe(true);
  });

  it('generates graph layout', () => {
    const state = createRepo('basic');
    const graph = graphLayout(state);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
  });
});

function runOk(state, command) {
  const result = runCommand(state, command);
  expect(result.error, `${command}: ${result.output.join('\n')}`).toBe(false);
  return result;
}

function runErr(state, command) {
  const result = runCommand(state, command);
  expect(result.error, `${command} should fail`).toBe(true);
  return result;
}

describe('Git simulator commands', () => {
  it('never mutates the input state', () => {
    const state = createRepo('initialized');
    const before = JSON.stringify(state);
    const result = runCommand(state, 'git add README.md');
    expect(result.state).not.toBe(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('handles init, status, touch, echo, add, commit, log and amend', () => {
    let state = createRepo('empty');
    expect(runErr(state, 'git status').output.join('\n')).toContain('bukan repository');
    state = runOk(state, 'git init').state;
    expect(state.initialized).toBe(true);
    expect(runOk(state, 'git status').output.join('\n')).toContain('On branch main');

    state = runOk(state, 'git touch catatan.txt').state;
    state = runOk(state, 'git echo "halo dunia" > catatan.txt').state;
    expect(state.workingDir['catatan.txt']).toBe('halo dunia\n');
    state = runOk(state, 'git add .').state;
    state = runOk(state, 'git commit -m "feat: catatan awal"').state;
    expect(Object.keys(state.commits)).toHaveLength(1);
    expect(runOk(state, 'git log --oneline').output.join('\n')).toContain('feat: catatan awal');
    expect(runOk(state, 'git status').output.join('\n')).toContain('working tree clean');

    state = runOk(state, 'git echo "baris kedua" >> catatan.txt').state;
    state = runOk(state, 'git add catatan.txt').state;
    state = runOk(state, 'git commit --amend -m "feat: catatan lengkap"').state;
    expect(state.commits[state.branches.main].message).toBe('feat: catatan lengkap');
    expect(() => runErr(state, 'git commit')).not.toThrow();
  });

  it('supports branches, fast-forward merge and branch cleanup', () => {
    let state = createRepo('basic');
    state = runOk(state, 'git switch -c feature').state;
    expect(state.HEAD.ref).toBe('feature');
    state = runOk(state, 'git echo "fitur" > fitur.txt').state;
    state = runOk(state, 'git add fitur.txt').state;
    state = runOk(state, 'git commit -m "feat: fitur baru"').state;
    const featureTip = state.branches.feature;

    state = runOk(state, 'git switch main').state;
    const merged = runOk(state, 'git merge feature');
    state = merged.state;
    expect(merged.output.join('\n')).toContain('Fast-forward');
    expect(state.branches.main).toBe(featureTip);
    expect(runOk(state, 'git branch -d feature').state.branches.feature).toBeUndefined();
  });

  it('creates a real merge commit with --no-ff', () => {
    let state = createRepo('basic');
    state = runOk(state, 'git switch -c feature').state;
    state = runOk(state, 'git echo "fitur" > fitur.txt').state;
    state = runOk(state, 'git add fitur.txt').state;
    state = runOk(state, 'git commit -m "feat: fitur"').state;
    state = runOk(state, 'git switch main').state;
    state = runOk(state, 'git echo "main" > main.txt').state;
    state = runOk(state, 'git add main.txt').state;
    state = runOk(state, 'git commit -m "feat: main"').state;
    state = runOk(state, 'git merge --no-ff feature').state;
    const tip = state.commits[state.branches.main];
    expect(tip.parents).toHaveLength(2);
    expect(tip.message).toContain('Merge branch');
  });

  it('handles conflicts, staged resolution and merge commit', () => {
    let state = createRepo('conflict');
    const result = runErr(state, 'git merge feature/header');
    state = result.state;
    expect(state.conflicts).toContain('app.js');
    expect(result.output.join('\n')).toContain('CONFLICT');

    state = runOk(state, 'git echo "const judul = \\"Aplikasi Saya\\";" > app.js').state;
    state = runOk(state, 'git add app.js').state;
    expect(state.conflicts).toHaveLength(0);
    state = runOk(state, 'git commit -m "merge: selesaikan konflik"').state;
    expect(state.commits[state.branches.main].parents).toHaveLength(2);
  });

  it('covers diff, restore, checkout paths and reset modes', () => {
    let state = createRepo('basic');
    const head = state.branches.main;
    state = runOk(state, 'git echo "tambahan" > app.js').state;
    expect(runOk(state, 'git diff').output.join('\n')).toContain('diff --git a/app.js b/app.js');
    state = runOk(state, 'git restore app.js').state;
    expect(state.workingDir['app.js']).toBe(state.commits[head].files['app.js']);

    state = runOk(state, 'git echo "staged" > app.js').state;
    state = runOk(state, 'git add app.js').state;
    expect(runOk(state, 'git diff --staged').output.join('\n')).toContain('diff --git a/app.js b/app.js');
    state = runOk(state, 'git restore --staged app.js').state;
    expect(state.staging['app.js']).toBeUndefined();
    state = runOk(state, 'git checkout -- app.js').state;
    expect(state.workingDir['app.js']).toBe(state.commits[head].files['app.js']);

    state = runOk(state, 'git echo "commit baru" > app.js').state;
    state = runOk(state, 'git add app.js').state;
    state = runOk(state, 'git commit -m "feat: commit baru"').state;
    const newTip = state.branches.main;
    state = runOk(state, 'git reset --soft HEAD~1').state;
    expect(state.branches.main).toBe(head);
    expect(state.staging['app.js']).toBe('commit baru\n');
    expect(newTip).not.toBe(state.branches.main);

    state = runOk(state, 'git reset --hard HEAD').state;
    expect(state.workingDir['app.js']).toBe(state.commits[head].files['app.js']);
  });

  it('reverts a commit', () => {
    let state = createRepo('basic');
    const parent = state.commits[state.branches.main].parents[0];
    state = runOk(state, 'git revert HEAD').state;
    expect(Object.keys(state.commits)).toHaveLength(4);
    expect(state.workingDir['app.js']).toBe(state.commits[parent].files['app.js']);
  });

  it('clones and manages remotes, push, fetch and pull', () => {
    let state = createRepo('empty');
    state = runOk(state, 'git clone https://github.com/demo/repo.git lokal').state;
    expect(state.initialized).toBe(true);
    expect(state.remotes.origin.url).toBe('https://github.com/demo/repo.git');

    state = createRepo('initialized');
    state = runOk(state, 'git remote add origin https://example.com/repo.git').state;
    expect(runOk(state, 'git remote -v').output.join('\n')).toContain('origin');
    state = runOk(state, 'git remote set-url origin https://example.com/new.git').state;
    expect(state.remotes.origin.url).toBe('https://example.com/new.git');
    state = runOk(state, 'git remote remove origin').state;
    expect(state.remotes.origin).toBeUndefined();
    expect(runErr(state, 'git fetch origin').output.join('\n')).toContain("remote 'origin'");

    state = createRepo('remote');
    state = runOk(state, 'git echo "push" > push.txt').state;
    state = runOk(state, 'git add push.txt').state;
    state = runOk(state, 'git commit -m "feat: push"').state;
    const tip = state.branches.main;
    const pushed = runOk(state, 'git push -u origin main');
    state = pushed.state;
    expect(state.remotes.origin.branches.main).toBe(tip);
    expect(state.tracking.main).toBe('origin/main');
    expect(pushed.output.join('\n')).toContain('main -> main');
    expect(runOk(state, 'git fetch origin').state.FETCH_HEAD).toBe(tip);

    state = runOk(state, 'git reset --hard HEAD~1').state;
    expect(runErr(state, 'git push origin main').output.join('\n')).toContain('non-fast-forward');
  });

  it('pulls fast-forward changes from a remote tracking branch', () => {
    let state = createRepo('branches');
    const featureTip = state.branches['feature/login'];
    state.remotes.origin = { url: 'https://example.com/repo.git', branches: { main: featureTip } };
    state.tracking.main = 'origin/main';
    const result = runOk(state, 'git pull origin main');
    state = result.state;
    expect(state.branches.main).toBe(featureTip);
    expect(result.output.join('\n')).toContain('Fast-forward');
  });

  it('stashes and restores work in progress', () => {
    let state = createRepo('basic');
    const original = state.workingDir['README.md'];
    state = runOk(state, 'git echo "wip" > README.md').state;
    state = runOk(state, 'git stash push -m "wip"').state;
    expect(state.stash).toHaveLength(1);
    expect(state.workingDir['README.md']).toBe(original);
    expect(runOk(state, 'git stash list').output.join('\n')).toContain('wip');
    state = runOk(state, 'git stash pop').state;
    expect(state.stash).toHaveLength(0);
    expect(state.workingDir['README.md']).toBe('wip\n');
    state = runOk(state, 'git stash clear').state;
    expect(state.stash).toHaveLength(0);
  });

  it('creates, lists and deletes tags', () => {
    let state = createRepo('basic');
    state = runOk(state, 'git tag v1.0').state;
    state = runOk(state, 'git tag -a v1.1 -m "rilis"').state;
    expect(runOk(state, 'git tag').output.sort()).toEqual(['v1.0', 'v1.1']);
    state = runOk(state, 'git tag -d v1.0').state;
    expect(state.tags['v1.0']).toBeUndefined();
    expect(runErr(state, 'git tag -d tidak-ada').output.join('\n')).toContain('tidak ditemukan');
  });

  it('rebases a feature branch and supports interactive/abort paths', () => {
    let state = createRepo('rebase');
    const originalTip = state.branches['feature/api'];
    const result = runOk(state, 'git rebase main');
    state = result.state;
    expect(result.output.join('\n')).toContain('Successfully rebased');
    expect(state.branches['feature/api']).not.toBe(originalTip);
    const tip = state.commits[state.branches['feature/api']];
    const replayed = state.commits[tip.parents[0]];
    expect(replayed.message).toContain('feat: endpoint login');
    expect(replayed.parents[0]).toBe(state.branches.main);
    expect(tip.message).toContain('test: tes endpoint login');

    const interactive = runOk(state, 'git rebase -i main');
    expect(interactive.output.join('\n')).toContain('Interactive rebase');
    expect(interactive.state.branches['feature/api']).toBe(state.branches['feature/api']);
    expect(runErr(state, 'git rebase --abort').output.join('\n')).toContain('tidak ada rebase');
  });

  it('cherry-picks a commit onto another branch', () => {
    let state = createRepo('branches');
    state = runOk(state, 'git switch main').state;
    const result = runOk(state, 'git cherry-pick feature/login');
    state = result.state;
    expect(Object.keys(state.commits)).toHaveLength(4);
    expect(state.commits[state.branches.main].message).toBe('feat: form login');
    expect(result.output.join('\n')).toContain('feat: form login');
  });

  it('supports reflog and bisect', () => {
    let state = createRepo('history');
    expect(runOk(state, 'git reflog').output.length).toBeGreaterThan(0);
    state = runOk(state, 'git reflog expire').state;
    expect(state.reflog).toHaveLength(0);

    state = createRepo('history');
    state = runOk(state, 'git bisect start').state;
    state = runOk(state, 'git bisect good HEAD~4').state;
    const result = runOk(state, 'git bisect bad HEAD');
    expect(result.output.join('\n')).toContain('is the first bad commit');
    state = runOk(result.state, 'git bisect reset').state;
    expect(state.bisect).toBeNull();
  });

  it('covers rm, config, help and clear', () => {
    let state = createRepo('basic');
    state = runOk(state, 'git rm app.js').state;
    expect(state.workingDir['app.js']).toBeUndefined();
    expect(state.staging['app.js']).toBeNull();
    state = runOk(state, 'git commit -m "chore: hapus app"').state;
    expect(state.commits[state.branches.main].files['app.js']).toBeUndefined();

    state = runOk(state, 'git config user.name "Rina"').state;
    expect(runOk(state, 'git config user.name').output).toEqual(['Rina']);
    expect(runOk(state, 'git help').output.join('\n')).toContain('Perintah yang didukung');
    const cleared = runOk(state, 'git clear');
    expect(cleared.clear).toBe(true);
    expect(cleared.output).toEqual([]);
  });

  it('reports useful errors for invalid commands and paths', () => {
    let state = createRepo('initialized');
    expect(runErr(state, 'git add tidak-ada.txt').output.join('\n')).toContain('did not match');
    expect(runErr(state, 'git merge').output.join('\n')).toContain('sebutkan branch');
    expect(runErr(state, 'git branch tidak-ada').output.join('\n')).toContain('bukan commit');
    expect(runErr(state, 'git unknown').output.join('\n')).toContain('belum didukung');
  });
});
