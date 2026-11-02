// Practice validators. Supported types mirror docs/SEED-SCHEMA.md.
import {
  headFiles,
  indexFiles,
  isAncestor,
  reachableCommits,
  resolveRef,
} from './state.js';

const labelOf = (check) => check?.label || `Pemeriksaan ${check?.type || 'tidak dikenal'}`;

const KNOWN_TYPES = new Set([
  'initialized',
  'commit_count',
  'branch_exists',
  'branch_not_exists',
  'head_branch',
  'branch_merged',
  'file_untracked',
  'file_staged',
  'file_committed',
  'file_absent',
  'commit_message_contains',
  'tag_exists',
  'remote_branch_exists',
  'stash_count',
  'clean_worktree',
  'conflict_resolved',
  'reflog_contains',
  'detached_head',
  'command_used',
]);

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function cleanWorktree(state) {
  const head = headFiles(state);
  const index = indexFiles(state);
  const working = state.workingDir || {};
  const conflicted = new Set(state.conflicts || []);

  for (const path of new Set([...Object.keys(head), ...Object.keys(index)])) {
    if (head[path] !== index[path]) return false;
  }
  for (const path of new Set([...Object.keys(index), ...Object.keys(working)])) {
    if (conflicted.has(path)) continue;
    if (!has(index, path)) return false; // untracked
    if (index[path] !== working[path]) return false;
  }
  if (conflicted.size) return false;
  return true;
}

function checkResult(state, check) {
  const value = check.value;
  switch (check.type) {
    case 'initialized':
      return Boolean(state.initialized);

    case 'commit_count':
      return reachableCommits(state).length >= Number(value ?? 1);

    case 'branch_exists':
      return has(state.branches, value);

    case 'branch_not_exists':
      return !has(state.branches, value);

    case 'head_branch':
      return state.HEAD?.type === 'branch' && state.HEAD.ref === value;

    case 'branch_merged': {
      if (!has(state.branches, value)) return false;
      const sourceId = state.branches[value];
      const intoName = check.into || 'main';
      const targetId = has(state.branches, intoName)
        ? state.branches[intoName]
        : resolveRef(state, intoName);
      if (!sourceId || !targetId) return false;
      return isAncestor(state, sourceId, targetId);
    }

    case 'file_untracked': {
      const index = indexFiles(state);
      return has(state.workingDir, value) && !has(index, value);
    }

    case 'file_staged':
      return has(state.staging, value) && state.staging[value] !== null;

    case 'file_committed':
      return has(headFiles(state), value);

    case 'file_absent':
      return !has(state.workingDir, value);

    case 'commit_message_contains': {
      const needle = String(value ?? '').toLowerCase();
      return reachableCommits(state).some((id) =>
        String(state.commits[id]?.message || '').toLowerCase().includes(needle),
      );
    }

    case 'tag_exists':
      return has(state.tags, value);

    case 'remote_branch_exists': {
      const remote = check.remote || 'origin';
      return has(state.remotes?.[remote]?.branches, value);
    }

    case 'stash_count':
      return (state.stash?.length || 0) >= Number(value ?? 1);

    case 'clean_worktree':
      return cleanWorktree(state);

    case 'conflict_resolved':
      return !(state.conflicts || []).includes(value) && (state.resolvedConflicts || []).includes(value);

    case 'reflog_contains': {
      const needle = String(value ?? '').toLowerCase();
      return (state.reflog || []).some((entry) => String(entry.message || '').toLowerCase().includes(needle));
    }

    case 'detached_head':
      return state.HEAD?.type === 'detached';

    case 'command_used': {
      const needle = String(value ?? '').toLowerCase();
      return (state.commandLog || []).some((command) => String(command).toLowerCase().includes(needle));
    }

    default:
      return false;
  }
}

export function validatePractice(state, config = {}) {
  const checks = Array.isArray(config?.checks) ? config.checks : [];
  const results = checks.map((check) => {
    if (!check || !KNOWN_TYPES.has(check.type)) {
      return {
        label: `${labelOf(check)} (validator tidak dikenal)`,
        passed: false,
      };
    }
    return {
      label: labelOf(check),
      passed: Boolean(checkResult(state, check)),
    };
  });

  return {
    passed: results.every((check) => check.passed),
    checks: results,
  };
}
