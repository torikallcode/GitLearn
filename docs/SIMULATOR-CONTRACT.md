# Git simulator contract

Pure JS module at `frontend/src/features/git-simulator/engine/index.js`.

```js
import { createRepo, runCommand, validatePractice, graphLayout } from './engine'

const state = createRepo('basic')            // scenario: empty|initialized|basic|branches|conflict|remote|history|rebase
const result = runCommand(state, 'git commit -m "feat: login"')
// result: { state, output: string[], error: boolean }
// runCommand is pure: it returns a NEW state and never mutates the input.

const validation = validatePractice(state, practiceConfig)
// { passed: boolean, checks: [{ label, passed }] }

const graph = graphLayout(state)
// { lanes: [{ name, color, y }], nodes: [{ id, shortId, message, x, y, lane, branches: [], isHead }], edges: [{ from, to, color }], width, height }
```

Engine requirements:

- `createRepo(scenario)` returns the state model: `initialized`, `commits` (id → `{id,message,parents,timestamp,files}`), `branches` (name → commit id), `HEAD` (`{type:'branch'|'detached', ref}`), `workingDir` (`path → content`), `staging` (`path → content`), `remotes` (`name → {branches: {name: commitId}}`), `tags`, `stash`, `reflog`, `conflicts` (array of paths), `config` (`user.name`, `user.email`), `outputHistory` optional.
- Commands: `init`, `status`, `add`, `commit` (`-m`, `--amend`), `log` (`--oneline`, `--graph`), `branch` (`-a`, `-d`, `-m`), `switch`, `checkout` (`-b`), `merge` (`--no-ff`), `diff`, `restore`, `reset` (`--soft`, `--mixed`, `--hard`), `revert`, `clone`, `remote` (`add`, `-v`), `push`, `pull`, `fetch`, `stash` (`push`, `pop`, `list`, `apply`), `tag`, `rebase` (plain; `-i` accepted with a friendly message), `cherry-pick`, `reflog`, `bisect` (`start`, `good`, `bad`, `reset`), `touch`, `rm`, `echo "content" > file`, `config`, `help`, `clear`.
- State must be JSON-serializable (no functions/dates objects; timestamps are numbers).
- Friendly Indonesian errors, e.g. `fatal: bukan repository git (jalankan git init)`.
- Output mimics real git closely enough to transfer to a real terminal.
- Merge conflict: `branches` scenario has conflicting edits; `git merge` marks `conflicts`, blocks commit until files are edited/staged.
- Validators support every check type in `docs/SEED-SCHEMA.md`; unknown type fails with `label` + " (validator tidak dikenal)".
- Track a `commandLog` array of executed command strings in state; validator `command_used` matches case-insensitive substring.
- Deterministic commit ids (incrementing hash-like hex) so tests are stable.
- `graphLayout` handles 1 branch and multiple branches without overlap.
