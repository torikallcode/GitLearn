// State model + helpers for the GitLearn simulator.
// Pure, deterministic, JSON-serializable. No browser APIs.

export const BASE_TIMESTAMP = 1700000000; // fixed clock so tests are stable
const ID_BASE = 0x1f00000;

export const DEFAULT_CONFIG = {
  'user.name': 'Pemula Git',
  'user.email': 'pemula@example.com',
};

export const SCENARIOS = [
  { id: 'empty', label: 'Repo kosong', description: 'Belum ada repository. Mulai dengan git init.' },
  { id: 'initialized', label: 'Sudah init', description: 'Repository baru dengan README.md yang belum dilacak.' },
  { id: 'basic', label: 'Dasar', description: 'Tiga commit di branch main dengan file HTML, JS, CSS.' },
  { id: 'branches', label: 'Branch', description: 'main dan feature/login dengan commit terpisah.' },
  { id: 'conflict', label: 'Konflik', description: 'Dua branch mengubah baris yang sama di app.js.' },
  { id: 'remote', label: 'Remote', description: 'Repo terhubung ke origin di GitHub.' },
  { id: 'history', label: 'Riwayat', description: 'Lima commit realistis untuk latihan log.' },
  { id: 'rebase', label: 'Rebase', description: 'feature/api menyimpang dari main, siap di-rebase.' },
];

export function blankState() {
  return {
    initialized: false,
    commits: {},
    branches: {},
    HEAD: { type: 'branch', ref: 'main' },
    workingDir: {},
    staging: {},
    remotes: {},
    tracking: {},
    tags: {},
    tagMeta: {},
    stash: [],
    reflog: [],
    conflicts: [],
    resolvedConflicts: [],
    config: { ...DEFAULT_CONFIG },
    seq: 1,
    commandLog: [],
    outputHistory: [],
    bisect: null,
    pendingMerge: null,
    pendingRebase: null,
    pendingCherryPick: null,
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function nextId(state) {
  return (ID_BASE + state.seq++).toString(16);
}

function seedCommit(state, { message, parents = [], files, log = false }) {
  const id = nextId(state);
  state.commits[id] = {
    id,
    message,
    parents: [...parents],
    timestamp: BASE_TIMESTAMP + state.seq * 600,
    files: { ...files },
  };
  if (log) {
    state.reflog.unshift({
      id,
      message: parents.length ? `commit: ${firstLine(message)}` : `commit (initial): ${firstLine(message)}`,
      timestamp: BASE_TIMESTAMP + state.seq * 600,
    });
  }
  return id;
}

function setMain(state, id) {
  state.branches.main = id;
  state.HEAD = { type: 'branch', ref: 'main' };
  state.workingDir = { ...state.commits[id].files };
  state.staging = {};
  state.conflicts = [];
}

function firstLine(text) {
  return String(text || '').split('\n')[0];
}

// ---------- file content used by the seeded scenarios ----------

const README = '# Proyek Saya\n';
const README_LOG = '# GitLearn\n';

const INDEX_1 = '<!doctype html>\n<html lang="id">\n  <body>\n    <h1>Proyek Saya</h1>\n  </body>\n</html>\n';
const INDEX_2 =
  '<!doctype html>\n<html lang="id">\n  <body>\n    <h1>Proyek Saya</h1>\n    <form id="login">\n      <input type="email" name="email" />\n      <button>Masuk</button>\n    </form>\n  </body>\n</html>\n';

const APP_1 = 'function sapa(nama) {\n  return `Halo, ${nama}`;\n}\n\nconsole.log(sapa("Dunia"));\n';
const APP_2 =
  'function sapa(nama) {\n  return `Halo, ${nama}`;\n}\n\nfunction login(email) {\n  return email.length > 0;\n}\n\nconsole.log(sapa("Dunia"));\n';
const APP_3 =
  'function sapa(nama) {\n  return `Halo, ${nama}`;\n}\n\nfunction login(email) {\n  const pola = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/;\n  return pola.test(email);\n}\n\nconsole.log(sapa("Dunia"));\n';

const CSS_1 = 'body {\n  font-family: sans-serif;\n}\n';
const CSS_2 =
  'body {\n  font-family: sans-serif;\n}\n\nform {\n  display: grid;\n  gap: 8px;\n}\n';

const NAV_INDEX =
  '<!doctype html>\n<html lang="id">\n  <body>\n    <nav><a href="/">Beranda</a> | <a href="/login">Masuk</a></nav>\n    <h1>Proyek Saya</h1>\n  </body>\n</html>\n';
const BRANCH_APP = 'function sapa(nama) {\n  return `Halo, ${nama}`;\n}\n';
const LOGIN_APP =
  'function sapa(nama) {\n  return `Halo, ${nama}`;\n}\n\nfunction login(email) {\n  return email.includes("@");\n}\n';

const CONFLICT_BASE_APP =
  'const judul = "Aplikasi Saya";\n\nfunction tampilkanJudul() {\n  return judul;\n}\n';
const CONFLICT_MAIN_APP = CONFLICT_BASE_APP.replace('Aplikasi Saya', 'Aplikasi GitLearn');
const CONFLICT_FEATURE_APP = CONFLICT_BASE_APP.replace('Aplikasi Saya', 'Aplikasi Header Baru');
const CONFLICT_INDEX = '<!doctype html>\n<html lang="id"><body><h1>Proyek Saya</h1></body></html>\n';

function buildBasicHistory(state) {
  const c1 = seedCommit(state, {
    message: 'chore: initial commit',
    files: { 'README.md': README, 'index.html': INDEX_1, 'app.js': APP_1, 'style.css': CSS_1 },
    log: true,
  });
  const c2 = seedCommit(state, {
    message: 'feat: tambah halaman login',
    parents: [c1],
    files: { 'README.md': README, 'index.html': INDEX_2, 'app.js': APP_2, 'style.css': CSS_2 },
    log: true,
  });
  const c3 = seedCommit(state, {
    message: 'fix: validasi email',
    parents: [c2],
    files: { 'README.md': README, 'index.html': INDEX_2, 'app.js': APP_3, 'style.css': CSS_2 },
    log: true,
  });
  setMain(state, c3);
  return c3;
}

export function createRepo(scenario = 'empty') {
  const state = blankState();

  switch (scenario) {
    case 'empty':
      return state;

    case 'initialized': {
      state.initialized = true;
      state.branches = { main: null };
      state.HEAD = { type: 'branch', ref: 'main' };
      state.workingDir = { 'README.md': README };
      return state;
    }

    case 'basic':
      state.initialized = true;
      buildBasicHistory(state);
      return state;

    case 'branches': {
      state.initialized = true;
      const c1 = seedCommit(state, {
        message: 'chore: initial commit',
        files: { 'README.md': README, 'index.html': INDEX_1, 'app.js': BRANCH_APP },
        log: true,
      });
      const c2 = seedCommit(state, {
        message: 'feat: navbar',
        parents: [c1],
        files: { 'README.md': README, 'index.html': NAV_INDEX, 'app.js': BRANCH_APP },
        log: true,
      });
      const f1 = seedCommit(state, {
        message: 'feat: form login',
        parents: [c2],
        files: {
          'README.md': README,
          'index.html': NAV_INDEX,
          'app.js': LOGIN_APP,
          'login.js': 'export function formLogin() {\n  return true;\n}\n',
        },
      });
      state.branches = { main: c2, 'feature/login': f1 };
      state.HEAD = { type: 'branch', ref: 'main' };
      state.workingDir = { ...state.commits[c2].files };
      return state;
    }

    case 'conflict': {
      state.initialized = true;
      const base = seedCommit(state, {
        message: 'chore: initial commit',
        files: { 'README.md': README, 'index.html': CONFLICT_INDEX, 'app.js': CONFLICT_BASE_APP },
        log: true,
      });
      const main = seedCommit(state, {
        message: 'feat: ubah judul',
        parents: [base],
        files: { 'README.md': README, 'index.html': CONFLICT_INDEX, 'app.js': CONFLICT_MAIN_APP },
        log: true,
      });
      const feature = seedCommit(state, {
        message: 'feat: ubah header',
        parents: [base],
        files: {
          'README.md': README,
          'index.html': CONFLICT_INDEX,
          'app.js': CONFLICT_FEATURE_APP,
          'header.html': '<header>Header Baru</header>\n',
        },
      });
      state.branches = { main, 'feature/header': feature };
      state.HEAD = { type: 'branch', ref: 'main' };
      state.workingDir = { ...state.commits[main].files };
      return state;
    }

    case 'remote': {
      state.initialized = true;
      const tip = buildBasicHistory(state);
      state.remotes.origin = {
        url: 'https://github.com/demo/gitlearn.git',
        branches: { main: tip },
      };
      state.tracking.main = 'origin/main';
      return state;
    }

    case 'history': {
      state.initialized = true;
      const c1 = seedCommit(state, {
        message: 'chore: initial commit',
        files: { 'README.md': README_LOG, 'package.json': '{\n  "name": "gitlearn"\n}\n' },
        log: true,
      });
      const c2 = seedCommit(state, {
        message: 'feat: tambah struktur halaman',
        parents: [c1],
        files: {
          'README.md': README_LOG,
          'package.json': '{\n  "name": "gitlearn"\n}\n',
          'index.html': INDEX_1,
        },
        log: true,
      });
      const c3 = seedCommit(state, {
        message: 'feat: tambah form kontak',
        parents: [c2],
        files: {
          'README.md': README_LOG,
          'package.json': '{\n  "name": "gitlearn"\n}\n',
          'index.html': INDEX_2,
          'app.js': APP_2,
          'style.css': CSS_2,
        },
        log: true,
      });
      const c4 = seedCommit(state, {
        message: 'fix: perbaiki validasi form',
        parents: [c3],
        files: {
          'README.md': README_LOG,
          'package.json': '{\n  "name": "gitlearn"\n}\n',
          'index.html': INDEX_2,
          'app.js': APP_3,
          'style.css': CSS_2,
        },
        log: true,
      });
      const c5 = seedCommit(state, {
        message: 'docs: perbarui panduan kontribusi',
        parents: [c4],
        files: {
          'README.md': '# GitLearn\n\nPanduan kontribusi ada di CONTRIBUTING.md.\n',
          'CONTRIBUTING.md': '# Kontribusi\n\n1. Fork repository.\n2. Buat branch fitur.\n',
          'package.json': '{\n  "name": "gitlearn"\n}\n',
          'index.html': INDEX_2,
          'app.js': APP_3,
          'style.css': CSS_2,
        },
        log: true,
      });
      setMain(state, c5);
      return state;
    }

    case 'rebase': {
      state.initialized = true;
      const main1 = seedCommit(state, {
        message: 'chore: initial commit',
        files: { 'README.md': README_LOG, 'app.js': BRANCH_APP },
        log: true,
      });
      const main2 = seedCommit(state, {
        message: 'docs: panduan penggunaan',
        parents: [main1],
        files: {
          'README.md': '# GitLearn\n\nJalankan `npm run dev` untuk memulai.\n',
          'app.js': BRANCH_APP,
        },
        log: true,
      });
      const f1 = seedCommit(state, {
        message: 'feat: endpoint login',
        parents: [main1],
        files: {
          'README.md': README_LOG,
          'app.js': BRANCH_APP,
          'api.js': 'export function login(email) {\n  return Boolean(email);\n}\n',
        },
      });
      const f2 = seedCommit(state, {
        message: 'test: tes endpoint login',
        parents: [f1],
        files: {
          'README.md': README_LOG,
          'app.js': BRANCH_APP,
          'api.js': 'export function login(email) {\n  return Boolean(email);\n}\n',
          'api.test.js': 'import { login } from "./api.js";\n\nconsole.log(login("a@b.c"));\n',
        },
      });
      state.branches = { main: main2, 'feature/api': f2 };
      state.HEAD = { type: 'branch', ref: 'feature/api' };
      state.workingDir = { ...state.commits[f2].files };
      state.reflog.unshift({
        id: f2,
        message: 'checkout: moving from main to feature/api',
        timestamp: BASE_TIMESTAMP + state.seq * 600,
      });
      return state;
    }

    default:
      throw new Error(`Skenario tidak dikenal: ${scenario}`);
  }
}

// ---------- refs ----------

export function headId(state) {
  if (!state || !state.HEAD) return null;
  if (state.HEAD.type === 'detached') return state.commits[state.HEAD.ref] ? state.HEAD.ref : null;
  const id = state.branches?.[state.HEAD.ref];
  return id && state.commits[id] ? id : null;
}

export function headLabel(state) {
  if (!state.HEAD) return 'HEAD';
  if (state.HEAD.type === 'detached') return `detached HEAD at ${shortId(state.HEAD.ref)}`;
  return state.HEAD.ref;
}

export function resolveRef(state, ref) {
  if (ref == null) return null;
  if (typeof ref !== 'string') return null;
  const value = ref.trim();
  if (!value) return null;

  let match;
  if ((match = /^(.+)@\{(\d+)\}$/.exec(value))) {
    const index = Number(match[2]);
    if (match[1] === 'HEAD' || match[1] === '@') return state.reflog?.[index]?.id || null;
    return state.reflog?.[index]?.id || null;
  }
  if ((match = /^(.+)~(\d*)$/.exec(value))) {
    const count = match[2] === '' ? 1 : Number(match[2]);
    let id = resolveRef(state, match[1]);
    for (let i = 0; i < count && id; i++) id = state.commits[id]?.parents?.[0] || null;
    return id;
  }
  if ((match = /^(.+)\^(\d*)$/.exec(value))) {
    const index = match[2] === '' ? 1 : Number(match[2]);
    const id = resolveRef(state, match[1]);
    return id ? state.commits[id]?.parents?.[index - 1] || null : null;
  }

  if (value === 'HEAD' || value === '@') return headId(state);
  if (value.startsWith('refs/heads/')) return state.branches?.[value.slice(11)] ?? null;
  if (value.startsWith('refs/remotes/')) {
    const rest = value.slice(13);
    const slash = rest.indexOf('/');
    if (slash > 0) return state.remotes?.[rest.slice(0, slash)]?.branches?.[rest.slice(slash + 1)] ?? null;
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(state.branches || {}, value)) return state.branches[value];
  if (Object.prototype.hasOwnProperty.call(state.tags || {}, value)) return state.tags[value];

  const slash = value.indexOf('/');
  if (slash > 0) {
    const remote = value.slice(0, slash);
    const branch = value.slice(slash + 1);
    if (state.remotes?.[remote]?.branches?.[branch]) return state.remotes[remote].branches[branch];
  }

  const ids = Object.keys(state.commits || {});
  return ids.find((id) => id === value) || ids.find((id) => id.startsWith(value)) || null;
}

export function headFiles(state) {
  const id = headId(state);
  return id && state.commits[id] ? { ...state.commits[id].files } : {};
}

export function indexFiles(state) {
  const files = headFiles(state);
  for (const [path, content] of Object.entries(state.staging || {})) {
    if (content === null || content === undefined) delete files[path];
    else files[path] = content;
  }
  return files;
}

export function shortId(id) {
  return id ? String(id).slice(0, 7) : '';
}

export function snapshotFiles(state, commitId = null) {
  const id = commitId == null ? headId(state) : resolveRef(state, commitId);
  return id && state.commits[id] ? { ...state.commits[id].files } : {};
}

export function isAncestor(state, ancestor, descendant) {
  if (!ancestor || !descendant) return false;
  if (ancestor === descendant) return true;
  const seen = new Set();
  const stack = [descendant];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const commit = state.commits[id];
    if (!commit) continue;
    for (const parent of commit.parents || []) {
      if (parent === ancestor) return true;
      stack.push(parent);
    }
  }
  return false;
}

export function mergeBase(state, a, b) {
  if (!a || !b) return null;
  if (isAncestor(state, a, b)) return a;
  if (isAncestor(state, b, a)) return b;
  const ancestorsOfA = new Set();
  const stack = [a];
  while (stack.length) {
    const id = stack.pop();
    if (!id || ancestorsOfA.has(id)) continue;
    ancestorsOfA.add(id);
    for (const parent of state.commits[id]?.parents || []) stack.push(parent);
  }
  const queue = [b];
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (ancestorsOfA.has(id)) return id;
    for (const parent of state.commits[id]?.parents || []) queue.push(parent);
  }
  return null;
}

export function aheadBehind(state, localId, remoteId) {
  const reach = (start) => {
    const set = new Set();
    const stack = [start];
    while (stack.length) {
      const id = stack.pop();
      if (!id || set.has(id)) continue;
      set.add(id);
      for (const parent of state.commits[id]?.parents || []) stack.push(parent);
    }
    return set;
  };
  const local = reach(localId);
  const remote = reach(remoteId);
  return {
    ahead: [...local].filter((id) => !remote.has(id)).length,
    behind: [...remote].filter((id) => !local.has(id)).length,
  };
}

export function reachableCommits(state) {
  const roots = [];
  const rootSeen = new Set();
  const addRoot = (id) => {
    if (id && state.commits[id] && !rootSeen.has(id)) {
      rootSeen.add(id);
      roots.push(id);
    }
  };
  for (const id of Object.values(state.branches || {})) addRoot(id);
  addRoot(headId(state));
  for (const id of Object.values(state.tags || {})) addRoot(id);

  const visited = new Set();
  const order = [];
  const visit = (id) => {
    if (!id || visited.has(id) || !state.commits[id]) return;
    visited.add(id);
    for (const parent of state.commits[id].parents || []) visit(parent);
    order.push(id);
  };
  for (const root of roots) visit(root);
  return order;
}

export function topoSort(state) {
  return reachableCommits(state);
}

export function contentHash(text) {
  const source = String(text ?? '');
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(7, '0').slice(-7);
}

export function hasConflictMarkers(content) {
  return /^(<{7}|={7}|>{7})/m.test(String(content ?? ''));
}

export function formatDate(timestamp) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const date = new Date(Number(timestamp || 0) * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${days[date.getUTCDay()]} ${months[date.getUTCMonth()]} ${pad(date.getUTCDate())} ${pad(
    date.getUTCHours(),
  )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${date.getUTCFullYear()} +0000`;
}

export function firstLineOf(text) {
  return firstLine(text);
}
