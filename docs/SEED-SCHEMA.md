# Curriculum seed schema (`backend/seeds/curriculum-*.json`)

The seeder merges every `curriculum-*.json` file in `backend/seeds/` (alphabetical order). Each file has the same shape.

```json
{
  "paths": [
    {
      "slug": "git-fundamental",
      "title": "Git Fundamental",
      "description": "…",
      "order_no": 1,
      "track": "core",
      "modules": [
        {
          "title": "Pengenalan",
          "description": "…",
          "order_no": 1,
          "lessons": [
            {
              "slug": "apa-itu-version-control",
              "title": "Apa itu Version Control?",
              "estimated_minutes": 7,
              "order_no": 1,
              "content_md": "## …markdown…",
              "practice_config": {
                "scenario": "empty",
                "goal": "Inisialisasi repository dan buat commit pertama.",
                "commands": ["git init", "git add .", "git commit -m \"first commit\""],
                "checks": [
                  { "type": "initialized", "label": "Repository sudah diinisialisasi" },
                  { "type": "commit_count", "value": 1, "label": "Minimal 1 commit" }
                ],
                "hints": ["Mulai dengan git init.", "Buat file dengan touch lalu git add.", "git commit -m \"first commit\""]
              },
              "quizzes": [
                {
                  "question": "…",
                  "explanation": "…",
                  "options": [
                    { "text": "…", "correct": true },
                    { "text": "…", "correct": false },
                    { "text": "…", "correct": false },
                    { "text": "…", "correct": false }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "cheatsheet": [
    {
      "category": "Dasar",
      "command": "git init",
      "description": "Membuat repository Git baru.",
      "example": "git init"
    }
  ]
}
```

## Rules

- Minimum **3 quizzes** per lesson, maximum 5, exactly one correct option.
- `practice_config.scenario` is one of `empty`, `initialized`, `basic`, `branches`, `conflict`, `remote`, `history`, `rebase`.
- `commands` is a short list of commands shown as chips in the UI.
- `hints` has 3 entries, from vague to explicit.
- Supported `checks[].type` (extra keys depend on type):
  - `initialized`
  - `commit_count` (`value`: minimum number)
  - `branch_exists` / `branch_not_exists` (`value`: name)
  - `head_branch` (`value`: name)
  - `branch_merged` (`value`: branch name, `into`: target branch)
  - `file_untracked` / `file_staged` / `file_committed` / `file_absent` (`value`: path)
  - `commit_message_contains` (`value`: substring)
  - `tag_exists` (`value`: tag name)
  - `remote_branch_exists` (`value`: branch name, `remote`: remote name, default `origin`)
  - `stash_count` (`value`: minimum)
  - `clean_worktree`
  - `conflict_resolved` (`value`: path)
  - `reflog_contains` (`value`: substring)
  - `detached_head`
  - `command_used` (`value`: substring; matched against the simulator command history)
- `initial` is not needed; scenario factories provide the starting state.
- All content is in Bahasa Indonesia.
