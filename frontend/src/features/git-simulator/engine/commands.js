// Command implementations and the pure dispatcher.
import {
  BASE_TIMESTAMP,
  DEFAULT_CONFIG,
  aheadBehind,
  cloneState,
  contentHash,
  createRepo,
  firstLineOf,
  formatDate,
  hasConflictMarkers,
  headFiles,
  headId,
  indexFiles,
  isAncestor,
  mergeBase,
  resolveRef,
  shortId,
} from './state.js';
import { parseArgs, parseCommand } from './parser.js';

const ID_BASE = 0x1f00000;

const ok = (output = []) => ({ output, error: false });
const err = (output = []) => ({ output, error: true });

function newCommit(state, message, files, parents) {
  const id = (ID_BASE + state.seq++).toString(16);
  state.commits[id] = {
    id,
    message,
    parents: [...parents],
    timestamp: BASE_TIMESTAMP + state.seq * 600,
    files: { ...files },
  };
  return id;
}

function addReflog(state, id, message) {
  state.reflog.unshift({ id, message, timestamp: BASE_TIMESTAMP + state.seq * 600 });
}

function moveHeadTo(state, id) {
  if (state.HEAD.type === 'branch' && Object.prototype.hasOwnProperty.call(state.branches, state.HEAD.ref)) {
    state.branches[state.HEAD.ref] = id;
  } else {
    state.HEAD = { type: 'detached', ref: id };
  }
}

function currentBranch(state) {
  return state.HEAD.type === 'branch' ? state.HEAD.ref : null;
}

function subject(message) {
  return firstLineOf(message);
}

function unionPaths(...maps) {
  const paths = new Set();
  for (const map of maps) for (const path of Object.keys(map || {})) paths.add(path);
  return [...paths].sort();
}

function treeChanges(oldFiles, newFiles) {
  const changes = [];
  for (const path of unionPaths(oldFiles, newFiles)) {
    const before = oldFiles[path];
    const after = newFiles[path];
    if (before === after) continue;
    let kind;
    if (before === undefined) kind = 'added';
    else if (after === undefined) kind = 'deleted';
    else kind = 'modified';
    changes.push({ path, kind });
  }
  return changes;
}

function splitLines(text) {
  if (text === undefined || text === null) return [];
  const lines = String(text).split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function diffOps(oldText, newText) {
  const a = splitLines(oldText);
  const b = splitLines(newText);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ type: ' ', line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: '-', line: a[i++] });
    } else {
      ops.push({ type: '+', line: b[j++] });
    }
  }
  while (i < a.length) ops.push({ type: '-', line: a[i++] });
  while (j < b.length) ops.push({ type: '+', line: b[j++] });
  return { ops, oldCount: a.length, newCount: b.length };
}

function renderDiff(oldFiles, newFiles, filterTracked = null) {
  const lines = [];
  for (const path of unionPaths(oldFiles, newFiles)) {
    if (filterTracked && filterTracked.has(path) === false) continue;
    const before = oldFiles[path];
    const after = newFiles[path];
    if (before === after) continue;

    lines.push(`diff --git a/${path} b/${path}`);
    lines.push(
      `index ${before === undefined ? '0000000' : contentHash(before)}..${
        after === undefined ? '0000000' : contentHash(after)
      } 100644`,
    );
    lines.push(before === undefined ? '--- /dev/null' : `--- a/${path}`);
    lines.push(after === undefined ? '+++ /dev/null' : `+++ b/${path}`);
    const { ops, oldCount, newCount } = diffOps(before, after);
    lines.push(
      `@@ -${before === undefined ? 0 : 1},${oldCount} +${after === undefined ? 0 : 1},${newCount} @@`,
    );
    for (const op of ops) lines.push(`${op.type}${op.line}`);
  }
  return lines;
}

function changedFileStats(oldFiles, newFiles) {
  const changes = treeChanges(oldFiles, newFiles);
  let insertions = 0;
  let deletions = 0;
  for (const { path } of changes) {
    const { ops } = diffOps(oldFiles[path], newFiles[path]);
    for (const op of ops) {
      if (op.type === '+') insertions++;
      if (op.type === '-') deletions++;
    }
  }
  return { files: changes.length, insertions, deletions };
}

function statsLine(oldFiles, newFiles) {
  const stats = changedFileStats(oldFiles, newFiles);
  if (!stats.files) return null;
  const parts = [`${stats.files} file${stats.files === 1 ? '' : 's'} changed`];
  if (stats.insertions) parts.push(`${stats.insertions} insertion${stats.insertions === 1 ? '' : 's'}(+)`);
  if (stats.deletions) parts.push(`${stats.deletions} deletion${stats.deletions === 1 ? '' : 's'}(-)`);
  return ` ${parts.join(', ')}`;
}

// ---------- status helpers ----------

function statusData(state) {
  const head = headFiles(state);
  const index = indexFiles(state);
  const working = state.workingDir || {};
  const conflicted = new Set(state.conflicts || []);

  const staged = [];
  for (const path of unionPaths(head, index)) {
    if (head[path] === index[path]) continue;
    staged.push({
      path,
      kind: head[path] === undefined ? 'added' : index[path] === undefined ? 'deleted' : 'modified',
    });
  }

  const unstaged = [];
  for (const path of unionPaths(index, working)) {
    if (conflicted.has(path)) continue;
    if (!(path in index)) continue; // untracked, reported separately
    if (index[path] === working[path]) continue;
    unstaged.push({ path, kind: working[path] === undefined ? 'deleted' : 'modified' });
  }

  const untracked = [];
  for (const path of Object.keys(working)) {
    if (!(path in index) && !conflicted.has(path)) untracked.push(path);
  }
  untracked.sort();

  return { head, index, working, staged, unstaged, untracked };
}

function trackingLine(state) {
  const branch = currentBranch(state);
  if (!branch || !state.tracking?.[branch]) return null;
  const slash = state.tracking[branch].indexOf('/');
  if (slash <= 0) return null;
  const remote = state.tracking[branch].slice(0, slash);
  const remoteBranch = state.tracking[branch].slice(slash + 1);
  const remoteId = state.remotes?.[remote]?.branches?.[remoteBranch];
  const localId = state.branches?.[branch];
  if (!remoteId || !localId) return null;
  const { ahead, behind } = aheadBehind(state, localId, remoteId);
  const name = state.tracking[branch];
  if (ahead && behind) {
    return `Your branch and '${name}' have diverged, and have ${ahead} and ${behind} different commits each, respectively.`;
  }
  if (ahead) return `Your branch is ahead of '${name}' by ${ahead} commit${ahead === 1 ? '' : 's'}.`;
  if (behind) return `Your branch is behind '${name}' by ${behind} commit${behind === 1 ? '' : 's'}.`;
  return `Your branch is up to date with '${name}'.`;
}

function cmdStatus(state) {
  const out = [];
  const branch = currentBranch(state);
  const head = headId(state);

  if (state.HEAD.type === 'detached') {
    out.push(`HEAD detached at ${shortId(state.HEAD.ref)}`);
  } else {
    out.push(`On branch ${branch}`);
  }

  const tracking = trackingLine(state);
  if (tracking) out.push(tracking);
  if (!head) out.push('', 'No commits yet');

  const data = statusData(state);
  if (state.conflicts?.length) {
    out.push('', 'Unmerged paths:', '  (use "git add <file>..." to mark resolution)');
    for (const path of [...state.conflicts].sort()) out.push(`\tboth modified:   ${path}`);
  }
  if (data.staged.length) {
    out.push('', 'Changes to be committed:', '  (use "git restore --staged <file>..." to unstage)');
    for (const { path, kind } of data.staged) {
      const label = kind === 'added' ? 'new file:  ' : kind === 'deleted' ? 'deleted:   ' : 'modified:  ';
      out.push(`\t${label} ${path}`);
    }
  }
  if (data.unstaged.length) {
    out.push(
      '',
      'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
    );
    for (const { path, kind } of data.unstaged) {
      out.push(`\t${kind === 'deleted' ? 'deleted:   ' : 'modified:  '} ${path}`);
    }
  }
  if (data.untracked.length) {
    out.push('', 'Untracked files:', '  (use "git add <file>..." to include in what will be committed)');
    for (const path of data.untracked) out.push(`\t${path}`);
  }

  const anything =
    data.staged.length || data.unstaged.length || data.untracked.length || (state.conflicts?.length || 0) > 0;
  if (!anything) {
    if (head) out.push('', 'nothing to commit, working tree clean');
  } else if (!data.staged.length && data.untracked.length && !data.unstaged.length) {
    out.push('', 'nothing added to commit but untracked files present (use "git add" to track)');
  } else if (!data.staged.length) {
    out.push('', 'no changes added to commit (use "git add" and/or "git commit -a")');
  }
  return ok(out);
}

// ---------- commands ----------

function cmdInit(state) {
  if (state.initialized) return ok(['Reinitialized existing Git repository in .git/']);
  state.initialized = true;
  state.branches = { ...(state.branches || {}), main: state.branches?.main ?? null };
  state.HEAD = { type: 'branch', ref: 'main' };
  state.config = { ...DEFAULT_CONFIG, ...(state.config || {}) };
  return ok(['Initialized empty Git repository in .git/']);
}

function expandPaths(state, target) {
  if (target === '.') return unionPaths(state.workingDir, indexFiles(state));
  const candidates = new Set(unionPaths(state.workingDir, indexFiles(state)));
  if (candidates.has(target)) return [target];
  const prefix = target.endsWith('/') ? target : `${target}/`;
  return [...candidates].filter((path) => path.startsWith(prefix)).sort();
}

function cmdAdd(state, args) {
  const { flags, positionals } = parseArgs(args);
  const all = flags.has('A') || flags.has('all') || positionals.includes('.');
  let targets;
  if (all) {
    targets = unionPaths(state.workingDir, indexFiles(state));
  } else {
    targets = [];
    for (const positional of positionals) {
      const expanded = expandPaths(state, positional);
      if (!expanded.length) {
        return err([`fatal: pathspec '${positional}' did not match any files`]);
      }
      targets.push(...expanded);
    }
  }

  if (!targets.length && !all) return err(['fatal: tidak ada file yang ditambahkan.']);

  const index = indexFiles(state);
  for (const path of [...new Set(targets)]) {
    if (Object.prototype.hasOwnProperty.call(state.workingDir, path)) {
      state.staging[path] = state.workingDir[path];
      if ((state.conflicts || []).includes(path) && !hasConflictMarkers(state.workingDir[path])) {
        state.conflicts = state.conflicts.filter((item) => item !== path);
        state.resolvedConflicts = [...new Set([...(state.resolvedConflicts || []), path])];
      }
    } else if (Object.prototype.hasOwnProperty.call(index, path)) {
      state.staging[path] = null;
      if ((state.conflicts || []).includes(path)) {
        state.conflicts = state.conflicts.filter((item) => item !== path);
        state.resolvedConflicts = [...new Set([...(state.resolvedConflicts || []), path])];
      }
    }
  }
  return ok([]);
}

function cmdCommit(state, args) {
  const { flags, values } = parseArgs(args, ['m', 'message']);
  const message = values.m ?? values.message;

  if (state.conflicts?.length) {
    return err([
      'error: tidak dapat membuat commit karena masih ada konflik yang belum diselesaikan.',
      "hint: perbaiki file bertanda konflik, jalankan 'git add <file>', lalu commit kembali.",
    ]);
  }

  if (flags.has('a')) {
    const head = headFiles(state);
    const index = indexFiles(state);
    for (const path of unionPaths(head, index, state.workingDir)) {
      if (path in head || path in index) {
        if (Object.prototype.hasOwnProperty.call(state.workingDir, path)) state.staging[path] = state.workingDir[path];
        else state.staging[path] = null;
      }
    }
  }

  if (flags.has('amend')) {
    const oldId = headId(state);
    if (!oldId) return err(['fatal: tidak ada commit yang bisa di-amend.']);
    const old = state.commits[oldId];
    const files = indexFiles(state);
    const finalMessage = message ?? old.message;
    const id = newCommit(state, finalMessage, files, old.parents);
    moveHeadTo(state, id);
    state.staging = {};
    state.conflicts = [];
    state.pendingMerge = null;
    addReflog(state, id, `commit (amend): ${subject(finalMessage)}`);
    const out = [`[${currentBranch(state) || 'detached HEAD'} ${shortId(id)}] ${subject(finalMessage)}`];
    const stats = statsLine(old.files, files);
    if (stats) out.push(stats);
    return ok(out);
  }

  if (!message) {
    return err([
      'error: opsi -m dengan pesan commit wajib diisi.',
      'hint: contoh: git commit -m "feat: tambah fitur"',
    ]);
  }

  const oldId = headId(state);
  const oldFiles = headFiles(state);
  const files = indexFiles(state);
  if (!treeChanges(oldFiles, files).length) {
    const out = [`On branch ${currentBranch(state) || 'detached HEAD'}`];
    const data = statusData(state);
    if (data.untracked.length) out.push('', 'nothing added to commit but untracked files present (use "git add" to track)');
    else out.push('', 'nothing to commit, working tree clean');
    return ok(out);
  }

  const parents = oldId ? [oldId] : [];
  if (state.pendingMerge?.targetId) parents.push(state.pendingMerge.targetId);
  const id = newCommit(state, message, files, parents);
  moveHeadTo(state, id);
  state.staging = {};
  state.conflicts = [];
  state.resolvedConflicts = state.resolvedConflicts || [];
  const mergeCommit = Boolean(state.pendingMerge);
  state.pendingMerge = null;
  state.pendingCherryPick = null;
  addReflog(state, id, mergeCommit ? `commit (merge): ${subject(message)}` : `commit: ${subject(message)}`);

  const out = [`[${currentBranch(state) || 'detached HEAD'} ${shortId(id)}] ${subject(message)}`];
  const stats = statsLine(oldFiles, files);
  if (stats) out.push(stats);
  return ok(out);
}

function commitAncestors(state, startId) {
  const seen = new Set();
  const result = [];
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id) || !state.commits[id]) continue;
    seen.add(id);
    result.push(id);
    for (const parent of state.commits[id].parents || []) stack.push(parent);
  }
  return result.sort((a, b) => {
    const diff = state.commits[b].timestamp - state.commits[a].timestamp;
    return diff !== 0 ? diff : b.localeCompare(a);
  });
}

function cmdLog(state, args) {
  const { flags, values } = parseArgs(args, ['n', 'max-count']);
  let start = headId(state);
  if (!start && (flags.has('all') || flags.has('branches'))) {
    start = Object.values(state.branches || {}).find(Boolean) || null;
  }
  if (!start) {
    return err([`fatal: branch '${currentBranch(state) || 'HEAD'}' belum memiliki commit.`]);
  }

  const limitValue = Number(values.n ?? values['max-count'] ?? 0);
  let ids = commitAncestors(state, start);
  if (limitValue > 0) ids = ids.slice(0, limitValue);

  const oneline = flags.has('oneline');
  const graph = flags.has('graph');
  const out = [];
  ids.forEach((id, index) => {
    const commit = state.commits[id];
    if (index > 0) out.push('');
    const prefix = graph ? '* ' : '';
    if (oneline) {
      out.push(`${prefix}${shortId(id)} ${subject(commit.message)}`);
      return;
    }
    out.push(`${prefix}commit ${id}`);
    if ((commit.parents || []).length > 1) {
      out.push(`Merge: ${commit.parents.map((parent) => shortId(parent)).join(' ')}`);
    }
    out.push(`Author: ${state.config?.['user.name'] || DEFAULT_CONFIG['user.name']} <${state.config?.['user.email'] || DEFAULT_CONFIG['user.email']}>`);
    out.push(`Date:   ${formatDate(commit.timestamp)}`);
    out.push('');
    for (const line of String(commit.message).split('\n')) out.push(`    ${line}`);
  });
  return ok(out);
}

function cmdBranch(state, args) {
  const { flags, positionals } = parseArgs(args);

  if (flags.has('m') || flags.has('move')) {
    const oldName = positionals[0];
    const newName = positionals[1];
    if (!oldName || !newName) return err(['fatal: gunakan format: git branch -m <nama-lama> <nama-baru>']);
    if (!(oldName in state.branches)) return err([`fatal: branch '${oldName}' tidak ditemukan.`]);
    if (newName in state.branches) return err([`fatal: branch '${newName}' sudah ada.`]);
    state.branches[newName] = state.branches[oldName];
    delete state.branches[oldName];
    if (state.HEAD.type === 'branch' && state.HEAD.ref === oldName) state.HEAD.ref = newName;
    const oldTracking = state.tracking?.[oldName];
    if (oldTracking) {
      state.tracking[newName] = oldTracking;
      delete state.tracking[oldName];
    }
    return ok([]);
  }

  if (flags.has('d') || flags.has('D') || flags.has('delete')) {
    const force = flags.has('D') || flags.has('force');
    const out = [];
    for (const name of positionals) {
      if (!(name in state.branches)) return err([`error: branch '${name}' tidak ditemukan.`]);
      if (state.HEAD.type === 'branch' && state.HEAD.ref === name) {
        return err([`error: Tidak bisa menghapus branch '${name}': branch sedang aktif.`]);
      }
      const tip = state.branches[name];
      const merged = tip ? isAncestor(state, tip, headId(state)) : true;
      if (!merged && !force) {
        return err([
          `error: branch '${name}' belum sepenuhnya di-merge.`,
          `hint: gunakan 'git branch -D ${name}' jika yakin ingin menghapusnya.`,
        ]);
      }
      delete state.branches[name];
      if (state.tracking) delete state.tracking[name];
      out.push(`Deleted branch ${name} (was ${shortId(tip)}).`);
    }
    return ok(out);
  }

  if (!positionals.length) {
    const out = [];
    const names = Object.keys(state.branches || {}).sort();
    for (const name of names) {
      const marker = state.HEAD.type === 'branch' && state.HEAD.ref === name ? '*' : ' ';
      out.push(`${marker} ${name}`);
    }
    if (flags.has('a') || flags.has('all')) {
      for (const remote of Object.keys(state.remotes || {}).sort()) {
        for (const branch of Object.keys(state.remotes[remote].branches || {}).sort()) {
          out.push(`  remotes/${remote}/${branch}`);
        }
      }
    }
    return ok(out);
  }

  const name = positionals[0];
  if (name in state.branches) return err([`fatal: branch '${name}' sudah ada.`]);
  const startId = positionals[1] ? resolveRef(state, positionals[1]) : headId(state);
  if (!startId) {
    return err([`fatal: '${positionals[1] || 'HEAD'}' bukan commit yang valid.`]);
  }
  state.branches[name] = startId;
  return ok([]);
}

function isTreeClean(state) {
  const data = statusData(state);
  return !data.staged.length && !data.unstaged.length && !data.untracked.length && !(state.conflicts || []).length;
}

function checkoutTree(state, id) {
  if (isTreeClean(state) && state.commits[id]) {
    state.workingDir = { ...state.commits[id].files };
    state.staging = {};
    state.conflicts = [];
  }
}

function cmdSwitch(state, args) {
  const { flags, positionals } = parseArgs(args);

  if (args.includes('--')) {
    const paths = args.slice(args.indexOf('--') + 1);
    return restoreFromIndex(state, paths);
  }

  const create = flags.has('c') || flags.has('b') || flags.has('create');
  if (create) {
    const name = positionals[0];
    if (!name) return err(['fatal: nama branch wajib diisi.']);
    if (name in state.branches) return err([`fatal: branch '${name}' sudah ada.`]);
    const startId = positionals[1] ? resolveRef(state, positionals[1]) : headId(state);
    if (!startId) return err([`fatal: '${positionals[1] || 'HEAD'}' bukan commit yang valid.`]);
    state.branches[name] = startId;
    const from = state.HEAD.type === 'branch' ? state.HEAD.ref : shortId(state.HEAD.ref);
    state.HEAD = { type: 'branch', ref: name };
    if (state.commits[startId]) {
      state.workingDir = { ...state.commits[startId].files };
      state.staging = {};
      state.conflicts = [];
    }
    addReflog(state, startId, `checkout: moving from ${from} to ${name}`);
    return ok([`Switched to a new branch '${name}'`]);
  }

  const target = positionals[0];
  if (!target) return err(['fatal: sebutkan branch atau commit yang ingin dituju.']);

  if (Object.prototype.hasOwnProperty.call(state.branches, target)) {
    const old = state.HEAD.type === 'branch' ? state.HEAD.ref : shortId(state.HEAD.ref);
    if (state.HEAD.type === 'branch' && state.HEAD.ref === target) return ok([`Already on '${target}'`]);
    const id = state.branches[target];
    state.HEAD = { type: 'branch', ref: target };
    if (id) checkoutTree(state, id);
    addReflog(state, id, `checkout: moving from ${old} to ${target}`);
    return ok([`Switched to branch '${target}'`]);
  }

  const id = resolveRef(state, target);
  if (!id) return err([`fatal: '${target}' bukan branch atau commit yang dikenal.`]);
  const old = state.HEAD.type === 'branch' ? state.HEAD.ref : shortId(state.HEAD.ref);
  state.HEAD = { type: 'detached', ref: id };
  checkoutTree(state, id);
  addReflog(state, id, `checkout: moving from ${old} to ${target}`);
  return ok([
    `Note: switching to '${shortId(id)}'.`,
    '',
    "You are in 'detached HEAD' state. Perubahan yang kamu buat tidak terikat branch.",
    `HEAD is now at ${shortId(id)} ${subject(state.commits[id].message)}`,
  ]);
}

function restoreFromIndex(state, paths) {
  const index = indexFiles(state);
  const targets = paths.includes('.') ? Object.keys(index) : paths;
  if (!targets.length) return err(['fatal: sebutkan file yang ingin di-restore.']);
  for (const path of targets) {
    if (!(path in index)) return err([`error: pathspec '${path}' tidak cocok dengan file yang dilacak.`]);
    state.workingDir[path] = index[path];
  }
  return ok([]);
}

function mergeTrees(base, ours, theirs, label) {
  const files = {};
  const conflicts = [];
  const withNewline = (content) => (!content ? '' : content.endsWith('\n') ? content : `${content}\n`);

  for (const path of unionPaths(base, ours, theirs)) {
    const before = base[path];
    const mine = ours[path];
    const other = theirs[path];
    const oursChanged = mine !== before;
    const theirsChanged = other !== before;

    if (!theirsChanged) {
      if (mine !== undefined) files[path] = mine;
      continue;
    }
    if (!oursChanged) {
      if (other !== undefined) files[path] = other;
      continue;
    }
    if (mine === other) {
      if (mine !== undefined) files[path] = mine;
      continue;
    }
    conflicts.push(path);
    files[path] =
      `<<<<<<< HEAD\n${withNewline(mine)}=======\n${withNewline(other)}>>>>>>> ${label}\n`;
  }
  return { files, conflicts };
}

function performMerge(state, sourceId, label, options = {}) {
  const oursId = headId(state);
  if (!oursId) return err(['fatal: branch saat ini belum memiliki commit untuk di-merge.']);
  if (!state.commits[sourceId]) return err([`fatal: '${label}' bukan commit yang valid.`]);

  if (isAncestor(state, sourceId, oursId)) return ok(['Already up to date.']);

  if (isAncestor(state, oursId, sourceId) && !options.noFF) {
    moveHeadTo(state, sourceId);
    state.workingDir = { ...state.commits[sourceId].files };
    state.staging = {};
    state.conflicts = [];
    state.pendingMerge = null;
    addReflog(state, sourceId, `merge ${label}: Fast-forward`);
    const stats = statsLine(state.commits[oursId].files, state.commits[sourceId].files);
    return ok([`Updating ${shortId(oursId)}..${shortId(sourceId)}`, 'Fast-forward', stats].filter(Boolean));
  }

  const baseId = mergeBase(state, oursId, sourceId);
  const baseFiles = baseId ? state.commits[baseId].files : {};
  const oursFiles = headFiles(state);
  const theirsFiles = state.commits[sourceId].files;
  const { files, conflicts } = mergeTrees(baseFiles, oursFiles, theirsFiles, label);

  if (conflicts.length) {
    state.workingDir = { ...files };
    state.staging = {};
    for (const path of unionPaths(oursFiles, files)) {
      if (conflicts.includes(path)) continue;
      if (oursFiles[path] === files[path]) continue;
      state.staging[path] = files[path] === undefined ? null : files[path];
    }
    state.conflicts = conflicts;
    state.resolvedConflicts = (state.resolvedConflicts || []).filter((path) => !conflicts.includes(path));
    state.pendingMerge = { targetId: sourceId, targetLabel: label };
    const out = conflicts.map((path) => `Auto-merging ${path}`);
    for (const path of conflicts) out.push(`CONFLICT (content): Merge conflict in ${path}`);
    out.push('Automatic merge failed; fix conflicts and then commit the result.');
    return err(out);
  }

  const message = options.message || `Merge branch '${label}'`;
  const id = newCommit(state, message, files, [oursId, sourceId]);
  moveHeadTo(state, id);
  state.workingDir = { ...files };
  state.staging = {};
  state.conflicts = [];
  state.pendingMerge = null;
  addReflog(state, id, `merge ${label}: Merge made by the 'ort' strategy.`);
  const stats = statsLine(oursFiles, files);
  return ok([`Merge made by the 'ort' strategy.`, stats].filter(Boolean));
}

function cmdMerge(state, args) {
  const { flags, values, positionals } = parseArgs(args, ['m', 'message']);
  const target = positionals[0];
  if (!target) return err(['fatal: sebutkan branch yang ingin di-merge.']);
  const id = resolveRef(state, target);
  if (!id) return err([`fatal: '${target}' bukan branch atau commit yang valid.`]);
  if (state.conflicts?.length) {
    return err(['error: masih ada konflik yang belum diselesaikan. Selesaikan dulu sebelum merge lagi.']);
  }
  return performMerge(state, id, target, {
    noFF: flags.has('no-ff') || flags.has('noff'),
    message: values.m ?? values.message,
  });
}

function cmdDiff(state, args) {
  const { flags } = parseArgs(args);
  const staged = flags.has('staged') || flags.has('cached');
  if (staged) {
    return ok(renderDiff(headFiles(state), indexFiles(state)));
  }
  const index = indexFiles(state);
  const tracked = new Set(Object.keys(index));
  return ok(renderDiff(index, state.workingDir, tracked));
}

function cmdRestore(state, args) {
  const { flags, positionals } = parseArgs(args, ['source']);
  const staged = flags.has('staged');
  const targets = positionals.length ? positionals : [];
  if (!targets.length) return err(['fatal: sebutkan file yang ingin di-restore.']);

  if (staged) {
    const head = headFiles(state);
    for (const path of targets.includes('.') ? unionPaths(state.staging, head) : targets) {
      if (!(path in state.staging) && !(path in head)) continue;
      delete state.staging[path];
    }
    if (flags.has('worktree') || flags.has('W')) {
      const index = indexFiles(state);
      for (const path of targets.includes('.') ? Object.keys(index) : targets) {
        if (path in index) state.workingDir[path] = index[path];
      }
    }
    return ok([]);
  }

  const head = headFiles(state);
  for (const path of targets.includes('.') ? Object.keys(head) : targets) {
    if (!(path in head)) {
      return err([`error: pathspec '${path}' tidak cocok dengan file yang dilacak.`]);
    }
    state.workingDir[path] = head[path];
  }
  return ok([]);
}

function cmdReset(state, args) {
  const { flags, positionals } = parseArgs(args);
  const mode = flags.has('hard') ? 'hard' : flags.has('soft') ? 'soft' : 'mixed';
  const target = positionals[0] || 'HEAD';
  const id = resolveRef(state, target);
  if (!id) return err([`fatal: ambiguous argument '${target}': unknown revision.`]);

  const previousIndex = indexFiles(state);
  moveHeadTo(state, id);
  if (mode === 'soft') {
    const targetFiles = headFiles(state);
    state.staging = {};
    for (const path of unionPaths(targetFiles, previousIndex)) {
      if (targetFiles[path] !== previousIndex[path]) {
        state.staging[path] = previousIndex[path] === undefined ? null : previousIndex[path];
      }
    }
  } else {
    state.staging = {};
  }
  if (mode === 'hard') {
    state.workingDir = { ...state.commits[id].files };
    state.conflicts = [];
    state.pendingMerge = null;
    state.pendingRebase = null;
    state.pendingCherryPick = null;
  }
  addReflog(state, id, `reset: moving to ${target}`);
  return ok([`HEAD is now at ${shortId(id)} ${subject(state.commits[id].message)}`]);
}

function cmdRevert(state, args) {
  const { values, positionals } = parseArgs(args, ['m', 'message']);
  if (state.conflicts?.length) {
    return err(['error: tidak bisa revert saat masih ada konflik yang belum diselesaikan.']);
  }
  const target = positionals[0] || 'HEAD';
  const id = resolveRef(state, target);
  if (!id) return err([`fatal: '${target}' bukan commit yang valid.`]);

  const commit = state.commits[id];
  const parentId = commit.parents?.[0];
  const parentFiles = parentId ? state.commits[parentId].files : {};
  const current = headFiles(state);
  const result = { ...current };
  for (const path of unionPaths(parentFiles, commit.files)) {
    if (parentFiles[path] === commit.files[path]) continue;
    if (parentFiles[path] === undefined) delete result[path];
    else result[path] = parentFiles[path];
  }

  const message = values.m ?? values.message ?? `Revert "${subject(commit.message)}"`;
  const parent = headId(state);
  const newId = newCommit(state, message, result, parent ? [parent] : []);
  moveHeadTo(state, newId);
  state.workingDir = { ...result };
  state.staging = {};
  state.conflicts = [];
  addReflog(state, newId, `revert: ${subject(message)}`);
  const out = [`[${currentBranch(state) || 'detached HEAD'} ${shortId(newId)}] ${subject(message)}`];
  const stats = statsLine(current, result);
  if (stats) out.push(stats);
  return ok(out);
}

function cmdClone(state, args) {
  const { positionals } = parseArgs(args);
  const url = positionals[0];
  if (!url) return err(['fatal: Anda harus menentukan URL repository untuk di-clone.']);
  if (state.initialized) {
    return err([
      'fatal: folder ini sudah merupakan repository git.',
      'hint: clone hanya bisa dijalankan di folder kosong (di luar repository).',
    ]);
  }
  const dir =
    positionals[1] ||
    url.replace(/\/$/, '').split('/').pop().replace(/\.git$/, '') ||
    'repository';

  const fresh = createRepo('basic');
  const tip = fresh.branches.main;
  const commandLog = state.commandLog || [];
  Object.assign(state, fresh, {
    commandLog,
    outputHistory: state.outputHistory || [],
    config: { ...DEFAULT_CONFIG, ...(state.config || {}) },
  });
  state.remotes = {
    origin: { url, branches: { main: tip } },
  };
  state.tracking = { main: 'origin/main' };
  state.reflog.unshift({
    id: tip,
    message: `clone: from ${url}`,
    timestamp: BASE_TIMESTAMP + state.seq * 600,
  });
  return ok([`Cloning into '${dir}'...`, 'remote: Enumerating objects: done.', 'Receiving objects: 100% done.']);
}

function cmdRemote(state, args) {
  const { flags, positionals } = parseArgs(args);
  const action = positionals[0];

  if (action === 'add') {
    const name = positionals[1];
    const url = positionals[2];
    if (!name || !url) return err(['fatal: gunakan format: git remote add <nama> <url>']);
    if (state.remotes[name]) return err([`fatal: remote '${name}' sudah ada.`]);
    state.remotes[name] = { url, branches: {} };
    return ok([]);
  }
  if (action === 'remove' || action === 'rm') {
    const name = positionals[1];
    if (!name) return err(['fatal: sebutkan nama remote yang ingin dihapus.']);
    if (!state.remotes[name]) return err([`fatal: remote '${name}' tidak ditemukan.`]);
    delete state.remotes[name];
    for (const [branch, tracking] of Object.entries(state.tracking || {})) {
      if (tracking.startsWith(`${name}/`)) delete state.tracking[branch];
    }
    return ok([]);
  }
  if (action === 'set-url') {
    const name = positionals[1];
    const url = positionals[2];
    if (!state.remotes[name]) return err([`fatal: remote '${name}' tidak ditemukan.`]);
    state.remotes[name].url = url;
    return ok([]);
  }

  const out = [];
  const names = Object.keys(state.remotes || {}).sort();
  if (flags.has('v') || flags.has('verbose')) {
    for (const name of names) {
      out.push(`${name}\t${state.remotes[name].url} (fetch)`);
      out.push(`${name}\t${state.remotes[name].url} (push)`);
    }
  } else {
    out.push(...names);
  }
  return ok(out);
}

function remoteError(remote) {
  return err([
    `fatal: remote '${remote}' tidak ditemukan.`,
    `hint: tambahkan dulu dengan 'git remote add ${remote} <url>'.`,
  ]);
}

function cmdPush(state, args) {
  const { flags, positionals } = parseArgs(args);
  const remote = positionals[0] || 'origin';
  const branch = positionals[1] || currentBranch(state);
  if (!branch) return err(['fatal: HEAD sedang detached; sebutkan branch yang ingin di-push.']);
  if (!state.remotes[remote]) {
    return err([
      'fatal: No configured push destination.',
      `hint: tambahkan remote terlebih dahulu: git remote add origin <url>`,
    ]);
  }
  const localId = state.branches?.[branch];
  if (!localId) return err([`error: branch '${branch}' belum memiliki commit untuk di-push.`]);

  const remoteBranches = state.remotes[remote].branches || (state.remotes[remote].branches = {});
  const oldId = remoteBranches[branch];
  if (oldId && !isAncestor(state, oldId, localId)) {
    return err([
      `To ${state.remotes[remote].url}`,
      ` ! [rejected]        ${branch} -> ${branch} (non-fast-forward)`,
      `error: failed to push some refs to '${state.remotes[remote].url}'`,
      "hint: tarik perubahan dulu dengan 'git pull'.",
    ]);
  }

  const out = [];
  if (oldId === localId) {
    out.push('Everything up-to-date');
  } else {
    remoteBranches[branch] = localId;
    out.push(`To ${state.remotes[remote].url}`);
    if (oldId) out.push(`   ${shortId(oldId)}..${shortId(localId)}  ${branch} -> ${branch}`);
    else out.push(` * [new branch]      ${branch} -> ${branch}`);
  }
  if (flags.has('u') || flags.has('set-upstream')) {
    state.tracking[branch] = `${remote}/${branch}`;
    out.push(`branch '${branch}' set up to track '${remote}/${branch}'.`);
  }
  return ok(out);
}

function fetchLines(state, remote) {
  const url = state.remotes[remote].url;
  const out = [`From ${url}`];
  for (const branch of Object.keys(state.remotes[remote].branches || {}).sort()) {
    out.push(` * branch            ${branch}     -> FETCH_HEAD`);
    state.FETCH_HEAD = state.remotes[remote].branches[branch];
  }
  return out;
}

function cmdFetch(state, args) {
  const { positionals } = parseArgs(args);
  const remote = positionals[0] || 'origin';
  if (!state.remotes[remote]) return remoteError(remote);
  return ok(fetchLines(state, remote));
}

function cmdPull(state, args) {
  const { positionals } = parseArgs(args);
  const remote = positionals[0] || 'origin';
  const branch = positionals[1] || currentBranch(state);
  if (!state.remotes[remote]) return remoteError(remote);
  if (!branch) return err(['fatal: HEAD sedang detached; sebutkan branch yang ingin di-pull.']);
  const remoteId = state.remotes[remote].branches?.[branch];
  const prefetch = fetchLines(state, remote);
  if (!remoteId) {
    return err([
      ...prefetch,
      `fatal: couldn't find remote ref ${branch}`,
      `hint: jalankan 'git push -u ${remote} ${branch}' terlebih dahulu.`,
    ]);
  }
  const result = performMerge(state, remoteId, `${remote}/${branch}`);
  return { output: [...prefetch, ...result.output], error: result.error };
}

function stashHasChanges(state) {
  const data = statusData(state);
  return data.staged.length || data.unstaged.length || data.untracked.length;
}

function cmdStash(state, args) {
  const { flags, values, positionals } = parseArgs(args, ['m', 'message']);
  const action = positionals[0] || 'push';

  if (action === 'list') {
    return ok(state.stash.map((entry, index) => `stash@{${index}}: ${entry.message}`));
  }
  if (action === 'clear') {
    state.stash = [];
    return ok([]);
  }
  if (action === 'drop') {
    if (!state.stash.length) return ok([]);
    const entry = state.stash.shift();
    return ok([`Dropped stash@{0} (${shortId(entry.head)})`]);
  }

  if (action === 'pop' || action === 'apply') {
    if (state.conflicts?.length) {
      return err(['error: tidak bisa menerapkan stash saat masih ada konflik.']);
    }
    const raw = positionals[1] || '0';
    const match = /^stash@\{(\d+)\}$/.exec(raw) || /^(\d+)$/.exec(raw);
    const index = match ? Number(match[1]) : 0;
    if (!state.stash[index]) return err([`fatal: stash@{${index}} tidak ditemukan.`]);
    const entry = state.stash[index];
    state.workingDir = { ...entry.workingDir };
    state.staging = { ...(entry.staging || {}) };
    state.conflicts = [];
    const out = [];
    if (action === 'pop') {
      state.stash.splice(index, 1);
      out.push(`Applied stash@{${index}}`, `Dropped refs/stash@{${index}} (${shortId(entry.head)})`);
    } else {
      out.push(`Applied stash@{${index}}`);
    }
    return ok(out);
  }

  // push / save
  if (state.conflicts?.length) {
    return err(['error: tidak bisa stash saat masih ada konflik yang belum diselesaikan.']);
  }
  if (!stashHasChanges(state)) return ok(['No local changes to save']);
  const message =
    values.m ??
    values.message ??
    (positionals[1] && !positionals[1].startsWith('-') ? positionals[1] : null) ??
    `WIP on ${currentBranch(state) || 'HEAD'}: ${shortId(headId(state))} ${subject(
      state.commits[headId(state)]?.message || '',
    )}`;
  state.stash.unshift({
    message,
    workingDir: { ...state.workingDir },
    staging: { ...state.staging },
    head: headId(state),
    timestamp: BASE_TIMESTAMP + state.seq * 600,
  });
  state.workingDir = headFiles(state);
  state.staging = {};
  state.conflicts = [];
  return ok([`Saved working directory and index state ${message}`]);
}

function cmdTag(state, args) {
  const { flags, values, positionals } = parseArgs(args, ['m', 'message']);

  if (flags.has('d') || flags.has('delete')) {
    const out = [];
    for (const name of positionals) {
      if (!(name in state.tags)) return err([`error: tag '${name}' tidak ditemukan.`]);
      const id = state.tags[name];
      delete state.tags[name];
      if (state.tagMeta) delete state.tagMeta[name];
      out.push(`Deleted tag '${name}' (was ${shortId(id)})`);
    }
    return ok(out);
  }

  if (!positionals.length) {
    return ok(Object.keys(state.tags || {}).sort());
  }

  const name = positionals[0];
  if (name in state.tags) return err([`fatal: tag '${name}' sudah ada.`]);
  const target = positionals[1] || 'HEAD';
  const id = resolveRef(state, target);
  if (!id) return err([`fatal: '${target}' bukan commit yang valid.`]);
  state.tags[name] = id;
  state.tagMeta = state.tagMeta || {};
  state.tagMeta[name] = {
    annotated: Boolean(flags.has('a')),
    message: values.m ?? values.message ?? null,
  };
  return ok([]);
}

function cmdRebase(state, args) {
  const { flags, positionals } = parseArgs(args);
  if (flags.has('i') || flags.has('interactive')) {
    return ok([
      'Interactive rebase disimulasikan. Di Git asli, editor akan terbuka untuk memilih pick, squash, reword, atau drop.',
      'Simulator tidak mengubah state pada mode interaktif ini.',
    ]);
  }
  if (flags.has('abort')) {
    if (!state.pendingRebase) return err(['fatal: tidak ada rebase yang sedang berjalan.']);
    const pending = state.pendingRebase;
    state.HEAD = { ...pending.originalHead };
    if (pending.branch) state.branches[pending.branch] = pending.originalHeadId;
    state.workingDir = { ...(state.commits[pending.originalHeadId]?.files || {}) };
    state.staging = {};
    state.conflicts = [];
    state.pendingRebase = null;
    addReflog(state, pending.originalHeadId, `rebase (abort): returning to ${pending.branch || shortId(pending.originalHeadId)}`);
    return ok([`Rebase dibatalkan. HEAD kembali ke ${pending.branch || shortId(pending.originalHeadId)}.`]);
  }
  if (flags.has('continue')) return continueRebase(state);

  if (state.pendingRebase) {
    return err(['error: rebase masih berjalan. Selesaikan konflik lalu jalankan git rebase --continue.']);
  }
  const target = positionals[0];
  if (!target) return err(['fatal: sebutkan target rebase, contoh: git rebase main']);
  const targetId = resolveRef(state, target);
  if (!targetId) return err([`fatal: invalid upstream '${target}'.`]);
  return rebaseOnto(state, targetId, target);
}

function rebaseOnto(state, targetId, targetLabel) {
  const head = headId(state);
  if (!head) return err(['fatal: branch saat ini belum memiliki commit untuk di-rebase.']);
  const branch = currentBranch(state);
  const label = branch || shortId(head);

  if (targetId === head || isAncestor(state, targetId, head)) {
    return ok([`Current branch ${label} is up to date.`]);
  }

  if (isAncestor(state, head, targetId)) {
    moveHeadTo(state, targetId);
    state.workingDir = { ...state.commits[targetId].files };
    state.staging = {};
    state.conflicts = [];
    addReflog(state, targetId, `rebase finished: ${label} onto ${targetLabel}`);
    return ok([`Fast-forwarded ${label} to ${targetLabel}.`]);
  }

  const toReplay = [];
  let cursor = head;
  while (cursor && !isAncestor(state, cursor, targetId)) {
    toReplay.push(cursor);
    cursor = state.commits[cursor]?.parents?.[0] || null;
  }
  toReplay.reverse();
  if (!toReplay.length) return ok([`Current branch ${label} is up to date.`]);

  const originalHead = { ...state.HEAD };
  return replayCommits(state, {
    targetId,
    targetLabel,
    branch,
    label,
    originalHead,
    originalHeadId: head,
    queue: toReplay,
    newParent: targetId,
    files: { ...state.commits[targetId].files },
    applied: 0,
  });
}

function replayCommits(state, rebase) {
  let queue = [...rebase.queue];
  let newParent = rebase.newParent;
  let files = { ...rebase.files };
  let applied = rebase.applied;

  while (queue.length) {
    const commitId = queue[0];
    const commit = state.commits[commitId];
    const parentId = commit.parents?.[0];
    const parentFiles = parentId ? state.commits[parentId].files : {};
    const { result, conflicts } = applyCommitToTree(parentFiles, commit.files, files, `${shortId(commitId)} (${subject(commit.message)})`);

    if (conflicts.length) {
      state.HEAD = { type: 'detached', ref: newParent };
      state.workingDir = { ...result };
      state.staging = {};
      state.conflicts = conflicts;
      state.pendingRebase = {
        ...rebase,
        queue,
        newParent,
        files,
        applied,
        currentCommitId: commitId,
      };
      addReflog(state, newParent, `rebase (start): checkout ${rebase.targetLabel}`);
      const out = conflicts.map((path) => `Auto-merging ${path}`);
      for (const path of conflicts) out.push(`CONFLICT (content): Merge conflict in ${path}`);
      out.push(`error: could not apply ${shortId(commitId)}... ${subject(commit.message)}`);
      out.push("hint: perbaiki konflik, jalankan 'git add <file>', lalu 'git rebase --continue'.");
      return err(out);
    }

    const id = newCommit(state, commit.message, result, [newParent]);
    newParent = id;
    files = result;
    applied++;
    queue = queue.slice(1);
  }

  finishRebase(state, rebase, newParent, files, applied);
  return ok([`Successfully rebased and updated refs/heads/${rebase.branch || 'HEAD'}.`]);
}

function continueRebase(state) {
  const pending = state.pendingRebase;
  if (!pending) return err(['fatal: tidak ada rebase yang sedang berjalan.']);
  if (state.conflicts?.length) {
    return err([
      'error: masih ada konflik yang belum diselesaikan.',
      "hint: edit file, jalankan 'git add <file>', lalu coba lagi.",
    ]);
  }
  const commit = state.commits[pending.currentCommitId];
  const files = indexFiles(state);
  const id = newCommit(state, commit.message, files, [pending.newParent]);
  const rest = pending.queue.slice(1);
  const next = {
    ...pending,
    queue: rest,
    newParent: id,
    files,
    applied: pending.applied + 1,
  };
  state.pendingRebase = next;
  state.conflicts = [];
  state.HEAD = { type: 'detached', ref: id };
  state.staging = {};
  const result = replayCommits(state, next);
  if (result.error) return result;
  return ok(['Rebase dilanjutkan.', ...result.output]);
}

function finishRebase(state, rebase, newParent, files, applied) {
  state.HEAD = { ...rebase.originalHead };
  if (rebase.branch) state.branches[rebase.branch] = newParent;
  else state.HEAD = { type: 'detached', ref: newParent };
  state.workingDir = { ...files };
  state.staging = {};
  state.conflicts = [];
  state.pendingRebase = null;
  addReflog(state, newParent, `rebase finished: ${rebase.label} onto ${rebase.targetLabel} (${applied} commit)`);
}

function applyCommitToTree(parentFiles, commitFiles, targetFiles, label) {
  const result = { ...targetFiles };
  const conflicts = [];
  const withNewline = (content) => (!content ? '' : content.endsWith('\n') ? content : `${content}\n`);
  for (const path of unionPaths(parentFiles, commitFiles)) {
    const before = parentFiles[path];
    const after = commitFiles[path];
    if (before === after) continue;
    const current = targetFiles[path];
    if (current === before || current === after) {
      if (after === undefined) delete result[path];
      else result[path] = after;
      continue;
    }
    conflicts.push(path);
    result[path] =
      `<<<<<<< HEAD\n${withNewline(current)}=======\n${withNewline(after)}>>>>>>> ${label}\n`;
  }
  return { result, conflicts };
}

function cmdCherryPick(state, args) {
  const { positionals } = parseArgs(args);
  const target = positionals[0];
  if (!target) return err(['fatal: sebutkan commit yang ingin di-cherry-pick.']);
  if (state.conflicts?.length) return err(['error: selesaikan konflik yang ada sebelum cherry-pick.']);
  const id = resolveRef(state, target);
  if (!id) return err([`fatal: bad revision '${target}'.`]);

  const commit = state.commits[id];
  const parentId = commit.parents?.[0];
  const parentFiles = parentId ? state.commits[parentId].files : {};
  const { result, conflicts } = applyCommitToTree(
    parentFiles,
    commit.files,
    headFiles(state),
    `${shortId(id)} (${subject(commit.message)})`,
  );

  if (conflicts.length) {
    state.workingDir = { ...result };
    state.staging = {};
    state.conflicts = conflicts;
    state.pendingCherryPick = { commitId: id };
    const out = conflicts.map((path) => `Auto-merging ${path}`);
    for (const path of conflicts) out.push(`CONFLICT (content): Merge conflict in ${path}`);
    out.push(`error: could not apply ${shortId(id)}... ${subject(commit.message)}`);
    out.push("hint: perbaiki konflik, jalankan 'git add <file>', lalu commit.");
    return err(out);
  }

  const head = headId(state);
  const newId = newCommit(state, commit.message, result, head ? [head] : []);
  moveHeadTo(state, newId);
  state.workingDir = { ...result };
  state.staging = {};
  state.conflicts = [];
  state.pendingCherryPick = null;
  addReflog(state, newId, `cherry-pick: ${subject(commit.message)}`);
  const out = [`[${currentBranch(state) || 'detached HEAD'} ${shortId(newId)}] ${subject(commit.message)}`];
  const stats = statsLine(headFiles(state), result);
  if (stats) out.push(stats);
  return ok(out);
}

function cmdReflog(state, args) {
  const { flags, positionals } = parseArgs(args);
  const entries = state.reflog || [];
  if (flags.has('expire') || positionals[0] === 'expire') {
    state.reflog = [];
    return ok([]);
  }
  return ok(entries.map((entry, index) => `${shortId(entry.id)} HEAD@{${index}}: ${entry.message}`));
}

function cmdBisect(state, args) {
  const { positionals } = parseArgs(args);
  const action = positionals[0];

  if (action === 'start') {
    state.bisect = {
      active: true,
      good: null,
      bad: null,
      originalHead: { ...state.HEAD },
      firstBad: null,
    };
    return ok([
      'status: waiting for both good and bad commits',
      'hint: jalankan git bisect good <commit> dan git bisect bad <commit>',
    ]);
  }

  if (action === 'reset') {
    const original = state.bisect?.originalHead;
    state.bisect = null;
    return ok([`Bisect reset: HEAD kembali ke ${original?.ref || 'HEAD'}.`]);
  }

  if (action === 'good' || action === 'bad') {
    if (!state.bisect?.active) {
      return err(['fatal: tidak ada sesi bisect. Jalankan git bisect start terlebih dahulu.']);
    }
    const ref = positionals[1] || 'HEAD';
    const id = resolveRef(state, ref);
    if (!id) return err([`fatal: '${ref}' bukan commit yang valid.`]);
    state.bisect[action] = id;
    if (!state.bisect.good || !state.bisect.bad) {
      const need = !state.bisect.good ? 'good' : 'bad';
      return ok([`status: menunggu commit ${need} berikutnya`]);
    }
    const { good, bad } = state.bisect;
    let cursor = bad;
    const path = [];
    while (cursor && cursor !== good) {
      path.push(cursor);
      cursor = state.commits[cursor]?.parents?.[0] || null;
    }
    if (cursor !== good) {
      return err(['fatal: commit good bukan ancestor dari commit bad.']);
    }
    const firstBad = path[path.length - 1];
    state.bisect.active = false;
    state.bisect.firstBad = firstBad;
    const commit = state.commits[firstBad];
    return ok([
      'Bisecting: 0 revisions left to test after this (roughly 0 steps)',
      `${shortId(firstBad)} is the first bad commit`,
      `commit ${firstBad}`,
      `Author: ${state.config?.['user.name'] || DEFAULT_CONFIG['user.name']} <${state.config?.['user.email'] || DEFAULT_CONFIG['user.email']}>`,
      `Date:   ${formatDate(commit.timestamp)}`,
      '',
      `    ${subject(commit.message)}`,
    ]);
  }

  return err(['fatal: gunakan git bisect start|good|bad|reset.']);
}

function cmdTouch(state, args) {
  for (const file of parseArgs(args).positionals) {
    if (!Object.prototype.hasOwnProperty.call(state.workingDir, file)) state.workingDir[file] = '';
  }
  return ok([]);
}

function cmdRm(state, args) {
  const { flags, positionals } = parseArgs(args);
  if (!positionals.length) return err(['fatal: sebutkan file yang ingin dihapus.']);
  const out = [];
  const head = headFiles(state);
  const index = indexFiles(state);
  for (const path of positionals) {
    const exists = Object.prototype.hasOwnProperty.call(state.workingDir, path);
    const tracked = Object.prototype.hasOwnProperty.call(head, path) || Object.prototype.hasOwnProperty.call(index, path);
    if (!exists && !tracked) return err([`fatal: pathspec '${path}' did not match any files`]);
    if (!flags.has('cached') && exists) delete state.workingDir[path];
    if (tracked) state.staging[path] = null;
    if ((state.conflicts || []).includes(path)) {
      state.conflicts = state.conflicts.filter((item) => item !== path);
      state.resolvedConflicts = [...new Set([...(state.resolvedConflicts || []), path])];
    }
    out.push(`rm '${path}'`);
  }
  return ok(out);
}

function cmdEcho(state, args, parsed) {
  const { flags, positionals } = parseArgs(args);
  let text = positionals.join(' ');
  if (!flags.has('n')) text += '\n';
  if (parsed.redirect) {
    if (!parsed.redirect.file) return err(['fatal: file tujuan redirection tidak ditemukan.']);
    const file = parsed.redirect.file;
    if (parsed.redirect.mode === '>>') {
      state.workingDir[file] = `${state.workingDir[file] ?? ''}${text}`;
    } else {
      state.workingDir[file] = text;
    }
    return ok([]);
  }
  return ok([text.replace(/\n$/, '')]);
}

function cmdConfig(state, args) {
  const { flags, positionals } = parseArgs(args);
  if (!positionals.length || flags.has('list') || flags.has('l')) {
    return ok(Object.keys(state.config || {}).sort().map((key) => `${key}=${state.config[key]}`));
  }
  const [key, value] = positionals;
  if (value === undefined) {
    if (!(key in (state.config || {}))) return err([`fatal: konfigurasi '${key}' tidak ditemukan.`]);
    return ok([String(state.config[key])]);
  }
  state.config[key] = value;
  return ok([]);
}

function cmdHelp() {
  return ok([
    'Perintah yang didukung simulator:',
    '  init, status, add, commit (-m, --amend), log (--oneline, --graph, -n)',
    '  branch (-a, -d, -m), switch (-c), checkout (-b, -- file)',
    '  merge (--no-ff), diff (--staged), restore (--staged), reset (--soft/--mixed/--hard)',
    '  revert, clone, remote (add/-v/remove), push (-u), fetch, pull',
    '  stash (push/pop/apply/list), tag (-a/-d), rebase (-i), cherry-pick',
    '  reflog, bisect (start/good/bad/reset), config, touch, rm, echo, help, clear',
  ]);
}

const commands = {
  init: cmdInit,
  status: cmdStatus,
  add: cmdAdd,
  commit: cmdCommit,
  log: cmdLog,
  branch: cmdBranch,
  switch: cmdSwitch,
  checkout: cmdSwitch,
  merge: cmdMerge,
  diff: cmdDiff,
  restore: cmdRestore,
  reset: cmdReset,
  revert: cmdRevert,
  clone: cmdClone,
  remote: cmdRemote,
  push: cmdPush,
  fetch: cmdFetch,
  pull: cmdPull,
  stash: cmdStash,
  tag: cmdTag,
  rebase: cmdRebase,
  'cherry-pick': cmdCherryPick,
  reflog: cmdReflog,
  bisect: cmdBisect,
  touch: cmdTouch,
  rm: cmdRm,
  echo: cmdEcho,
  config: cmdConfig,
  help: cmdHelp,
  clear: () => ok([]),
};

const ALLOWED_UNINITIALIZED = new Set(['init', 'clone', 'help', 'clear', 'config', 'touch', 'echo', 'rm']);

export function runCommand(state, input) {
  const next = cloneState(state);
  const raw = typeof input === 'string' ? input : '';
  const trimmed = raw.trim();
  if (!trimmed) return { state: next, output: [], error: false };

  next.commandLog = Array.isArray(next.commandLog) ? next.commandLog : [];
  next.commandLog.push(trimmed);

  const parsed = parseCommand(trimmed);
  if (!parsed.command) return { state: next, output: [], error: false };

  if (parsed.command === 'clear') {
    return { state: next, output: [], error: false, clear: true };
  }

  if (parsed.parseError) {
    return { state: next, output: [`fatal: ${parsed.parseError}`], error: true };
  }

  if (!next.initialized && !ALLOWED_UNINITIALIZED.has(parsed.command)) {
    return {
      state: next,
      output: ['fatal: bukan repository git (atau folder di atasnya): .git', 'Jalankan git init terlebih dahulu.'],
      error: true,
    };
  }

  const handler = commands[parsed.command];
  if (!handler) {
    return {
      state: next,
      output: [
        `git: '${parsed.command}' is not a git command. Perintah ini belum didukung simulator (lihat 'git help').`,
      ],
      error: true,
    };
  }

  try {
    const result = handler(next, parsed.args || [], parsed) || {};
    const output = Array.isArray(result.output) ? result.output : [];
    next.outputHistory = Array.isArray(next.outputHistory) ? next.outputHistory : [];
    next.outputHistory.push(...output);
    return { state: next, output, error: Boolean(result.error) };
  } catch (error) {
    return { state: next, output: [`fatal: ${error.message}`], error: true };
  }
}

export { commands };
