# PRD: GitLearn — Platform Belajar Git & GitHub untuk Calon Frontend/Backend Engineer

| Item | Detail |
|---|---|
| Versi | 1.0 (Draft) |
| Tanggal | 30 Oktober 2026 |
| Status | Draft untuk review |
| Tech Stack | React.js, Vite, Tailwind CSS, Golang, Gin, MySQL |
| Arsitektur Backend | Layered Architecture |

---

## 1. Ringkasan Produk

**GitLearn** adalah website pembelajaran interaktif yang membantu pengguna **cepat memahami dan menguasai Git & GitHub** sampai level yang dibutuhkan seorang Frontend atau Backend Engineer profesional.

Pendekatan utama: **belajar sambil praktik langsung di browser** (terminal simulator + visualisasi commit graph), bukan sekadar membaca teori.

### Visi
Menjadi cara tercepat dan paling efektif bagi pemula untuk memahami Git & GitHub tanpa takut "merusak repository".

### Misi
- Menjelaskan konsep Git secara visual dan intuitif.
- Memberi ruang latihan aman (sandbox) tanpa instalasi apa pun.
- Mengarahkan pengguna dari nol sampai siap kerja tim (workflow profesional).

---

## 2. Latar Belakang & Masalah

| Masalah umum pemula | Dampak |
|---|---|
| Git terasa abstrak (staging, HEAD, branch, rebase) | Hanya menghafal command tanpa paham |
| Takut salah command (`reset --hard`, `force push`) | Ragu berlatih, kehilangan pekerjaan |
| Materi tersebar di banyak sumber, urutan tidak jelas | Belajar lambat dan tidak terstruktur |
| Tutorial pasif (baca/tonton saja) | Cepat lupa |
| Tidak tahu workflow tim nyata (PR, code review, conflict) | Belum siap bekerja di tim |

---

## 3. Tujuan & Metrik Keberhasilan

### 3.1 Tujuan Produk
1. Pengguna memahami konsep inti Git (bukan sekadar hafal command).
2. Pengguna mampu memakai workflow Git/GitHub standar industri.
3. Pengguna termotivasi konsisten belajar sampai selesai.

### 3.2 Success Metrics (KPI)

| Metrik | Target (3 bulan setelah rilis) |
|---|---|
| Completion rate jalur "Fundamental" | ≥ 50% |
| Rata-rata skor kuis pertama kali | ≥ 70% |
| Retensi mingguan (D7) | ≥ 35% |
| Waktu rata-rata sampai menyelesaikan modul pertama | ≤ 30 menit |
| NPS / kepuasan pengguna | ≥ 40 |
| Self-reported confidence ("saya paham Git") sebelum vs sesudah | Naik ≥ 2 poin (skala 1–5) |

### 3.3 Non-Goals (Versi 1)
- Bukan pengganti terminal Git asli (sandbox hanya simulasi).
- Tidak ada integrasi langsung ke akun GitHub asli pengguna (masuk roadmap fase lanjut).
- Tidak ada fitur live class / mentor 1-on-1.
- Tidak ada aplikasi mobile native (cukup responsive web).

---

## 4. Target Pengguna

### Persona 1 — Rina, Mahasiswa / Pemula Total
- Belum pernah memakai Git.
- Ingin cepat paham untuk tugas kelompok dan portofolio.
- Kebutuhan: penjelasan sederhana, banyak visual, bahasa Indonesia.

### Persona 2 — Dimas, Calon Frontend Engineer
- Sudah bisa HTML/CSS/JS, pernah `git add/commit/push` tanpa paham.
- Kebutuhan: workflow tim, branching, PR, conflict, deploy via GitHub Pages / Actions.

### Persona 3 — Sari, Calon Backend Engineer
- Bisa membuat API, belum rapi mengelola repo.
- Kebutuhan: branching strategy, rebase, tagging/release, CI/CD dasar, Git hooks.

---

## 5. Prinsip Desain Pembelajaran (Kunci "Cepat Paham")

| Prinsip | Penerapan di Produk |
|---|---|
| **Learning by doing** | Terminal simulator di setiap lesson |
| **Visualisasi** | Commit graph interaktif yang berubah real-time saat command dijalankan |
| **Small chunks (micro-learning)** | Lesson 5–10 menit, satu konsep per lesson |
| **Active recall** | Kuis singkat di akhir lesson |
| **Spaced repetition** | Fitur review harian untuk kuis yang pernah salah |
| **Safe failure** | Sandbox bisa di-reset kapan saja; tombol "Undo" |
| **Analogi nyata** | Contoh: Git = "save game", branch = "dunia paralel" |
| **Progressive disclosure** | Konsep sulit (rebase, reflog) baru muncul setelah dasar kuat |
| **Konteks karier** | Jalur terpisah: Frontend vs Backend |
| **Motivasi** | Progress bar, streak, badge, sertifikat penyelesaian |

---

## 6. Kurikulum / Learning Path

### 6.1 Struktur
`Learning Path → Modul → Lesson → (Teori singkat + Praktik + Kuis)`

### 6.2 Jalur Belajar

**Jalur A — Git Fundamental (wajib semua pengguna)**

| Modul | Lesson |
|---|---|
| 1. Pengenalan | Apa itu version control; Git vs GitHub; instalasi & konfigurasi |
| 2. Dasar Git | `init`, `status`, `add`, `commit`, `log`; konsep working dir/staging/repository; `.gitignore` |
| 3. Branching | `branch`, `switch/checkout`, `merge`; fast-forward vs merge commit |
| 4. Remote | `clone`, `remote`, `push`, `pull`, `fetch`; perbedaan fetch vs pull |
| 5. Undo & Perbaikan | `restore`, `reset` (soft/mixed/hard), `revert`, `commit --amend` |

**Jalur B — GitHub Collaboration**

| Modul | Lesson |
|---|---|
| 6. GitHub Basics | Repository, README, SSH/HTTPS, Personal Access Token |
| 7. Pull Request | Fork, PR, code review, merge strategies (merge/squash/rebase) |
| 8. Merge Conflict | Penyebab, cara baca conflict marker, resolusi |
| 9. Issue & Project | Issue, label, milestone, GitHub Projects |
| 10. Open Source | Cara kontribusi, `CONTRIBUTING.md`, etika kolaborasi |

**Jalur C — Profesional (Tingkat Lanjut)**

| Modul | Lesson |
|---|---|
| 11. Workflow Tim | Git Flow, GitHub Flow, Trunk-Based Development |
| 12. History Rewriting | `rebase`, interactive rebase, `cherry-pick`, `stash` |
| 13. Debugging dengan Git | `reflog`, `bisect`, `blame` |
| 14. Release | Tag, semantic versioning, GitHub Releases |
| 15. Otomasi | Git hooks, GitHub Actions dasar (CI) |
| 16. Keamanan | Jangan commit secret, `.env`, signed commits, branch protection |

**Jalur Karier (spesialisasi, opsional)**

| Frontend | Backend |
|---|---|
| Deploy ke GitHub Pages / Vercel dari repo | Branching untuk service/API & migrasi database |
| Konvensi commit (Conventional Commits) untuk monorepo UI | Versioning API, tagging release, changelog |
| CI: lint + test + build di GitHub Actions | CI: test Go + build Docker di GitHub Actions |
| Review PR komponen UI (preview deployment) | Review PR dengan fokus keamanan & performa |

> Alur rekomendasi: A → B → C, lalu pilih Jalur Karier.

### 6.3 Format Setiap Lesson
1. **Hook** — masalah nyata (contoh: "Kode kemarin hilang, kenapa?").
2. **Konsep** — penjelasan singkat + analogi + diagram.
3. **Demo visual** — animasi commit graph.
4. **Praktik** — tugas di terminal simulator (dengan hint bertahap).
5. **Kuis** — 3–5 soal.
6. **Ringkasan + Cheat sheet** — poin kunci & command.

---

## 7. Fitur Produk

### 7.1 MVP (Fase 1)

| ID | Fitur | Deskripsi | Prioritas |
|---|---|---|---|
| F-01 | Autentikasi | Register, login, logout (JWT) | P0 |
| F-02 | Katalog Learning Path | Daftar jalur, modul, lesson | P0 |
| F-03 | Halaman Lesson | Konten teori (Markdown), diagram, ringkasan | P0 |
| F-04 | Terminal Simulator | Simulasi command Git di browser (state di client) | P0 |
| F-05 | Commit Graph Visualizer | Visual branch/commit/HEAD yang update real-time | P0 |
| F-06 | Kuis | Multiple choice + validasi hasil praktik | P0 |
| F-07 | Progress Tracking | Status lesson, persentase modul, lanjut dari terakhir | P0 |
| F-08 | Dashboard | Ringkasan progress, rekomendasi lesson berikutnya | P0 |
| F-09 | Cheat Sheet | Daftar command + penjelasan, bisa dicari | P1 |

### 7.2 Fase 2 (Engagement)

| ID | Fitur | Deskripsi | Prioritas |
|---|---|---|---|
| F-10 | Challenge / Skenario Nyata | Contoh: "Selesaikan merge conflict ini" | P1 |
| F-11 | Spaced Repetition Review | Ulang kuis yang salah sesuai jadwal | P1 |
| F-12 | Gamifikasi | XP, streak harian, badge | P1 |
| F-13 | Sertifikat Penyelesaian | PDF/halaman publik yang bisa dibagikan | P2 |
| F-14 | Pencarian | Cari lesson/command | P1 |
| F-15 | Dark mode | Tema gelap/terang | P2 |

### 7.3 Fase 3 (Lanjutan)

| ID | Fitur | Deskripsi |
|---|---|---|
| F-16 | Mode "Explain this command" | Penjelasan command yang diketik pengguna |
| F-17 | Integrasi GitHub OAuth | Latihan di repo asli (opsional) |
| F-18 | Leaderboard & komunitas | Diskusi per lesson |
| F-19 | Admin CMS | Kelola konten lesson/kuis lewat UI |
| F-20 | Placement test | Tes awal untuk menentukan titik mulai |

---

## 8. User Flow Utama

```
Landing Page
   └─► Register / Login
          └─► Onboarding (pilih target: Frontend / Backend, level awal)
                 └─► Dashboard (rekomendasi jalur)
                        └─► Learning Path → Modul → Lesson
                               ├─ Baca konsep + lihat visual
                               ├─ Praktik di Terminal Simulator
                               ├─ Kerjakan Kuis
                               └─ Lesson selesai → progress tersimpan → lesson berikutnya
```

### Alur Praktik di Terminal Simulator
1. Sistem menampilkan **tujuan tugas** (contoh: "Buat branch `fitur-login`, lalu commit").
2. Pengguna mengetik command.
3. Simulator mengeksekusi (state repo virtual) → commit graph ter-update.
4. Validator memeriksa **state akhir repo** terhadap kriteria lesson.
5. Jika salah → hint bertahap (hint 1 samar → hint 3 jelas).
6. Jika benar → tandai selesai, lanjut.

---

## 9. Requirements Non-Fungsional

| Kategori | Requirement |
|---|---|
| Performa | LCP < 2,5 detik; respon API p95 < 300 ms |
| Responsif | Optimal di desktop, tetap usable di tablet/mobile |
| Aksesibilitas | Kontras warna memadai, navigasi keyboard, label ARIA |
| Keamanan | Hash password (bcrypt), JWT dengan expiry, validasi input, rate limiting, CORS terbatas, prepared statement |
| Skalabilitas | Backend stateless (siap horizontal scaling) |
| Observability | Structured logging, health check endpoint |
| Bahasa | Bahasa Indonesia (default), struktur siap i18n |
| Kompatibilitas | Browser modern (Chrome, Firefox, Safari, Edge — 2 versi terakhir) |
| Testing | Unit test service layer ≥ 70% coverage; integration test endpoint kritis |

---

## 10. Arsitektur Sistem

### 10.1 Gambaran Umum

```
┌────────────────────┐        HTTPS / JSON         ┌───────────────────────┐
│  Frontend (SPA)    │ ◄──────────────────────────►│  Backend API (Gin)    │
│  React + Vite      │                             │  Layered Architecture │
│  Tailwind CSS      │                             └──────────┬────────────┘
│  Git Simulator (JS)│                                        │
└────────────────────┘                                        ▼
                                                      ┌───────────────┐
                                                      │    MySQL      │
                                                      └───────────────┘
```

**Keputusan penting:** Terminal simulator & commit graph dijalankan **di sisi client (JavaScript)** agar responsif, tanpa beban server, dan aman. Backend hanya menangani data pengguna, konten, progress, dan kuis.

### 10.2 Backend — Layered Architecture (Golang + Gin)

```
Request ─► Handler ─► Service ─► Repository ─► MySQL
            (HTTP)    (Bisnis)    (Data)
```

| Layer | Tanggung Jawab | Boleh Bergantung ke |
|---|---|---|
| **Handler (Presentation)** | Parsing request, validasi input, panggil service, format response HTTP | Service (via interface), DTO |
| **Service (Business Logic)** | Aturan bisnis: hitung progress, validasi jawaban kuis, unlock lesson, kalkulasi XP/streak | Repository (via interface), Domain |
| **Repository (Data Access)** | Query ke MySQL, mapping ke entity | Database driver, Domain |
| **Domain / Model** | Entity dan aturan inti, tanpa dependensi framework | — |
| **Middleware** | Auth JWT, CORS, logging, recovery, rate limit | — |

**Aturan layering:**
- Dependensi hanya mengarah ke bawah (Handler → Service → Repository).
- Antar layer berkomunikasi lewat **interface** (memudahkan mocking & testing).
- Handler **tidak boleh** mengandung logika bisnis; Service **tidak boleh** mengetahui `gin.Context`.
- Dependency Injection dirakit manual di `cmd/api/main.go`.

### 10.3 Struktur Folder Backend

```
backend/
├── cmd/
│   └── api/
│       └── main.go                 # entry point + wiring dependency
├── internal/
│   ├── config/                     # load env/config
│   ├── domain/                     # entity: user, path, module, lesson, quiz, progress
│   ├── dto/                        # request/response struct
│   ├── handler/                    # gin handlers (auth, path, lesson, quiz, progress)
│   ├── service/                    # business logic + interface
│   ├── repository/                 # data access + interface (MySQL)
│   ├── middleware/                 # auth, cors, logger, rate limiter
│   ├── router/                     # registrasi route
│   └── pkg/
│       ├── jwt/
│       ├── hash/
│       ├── response/               # helper response standar
│       └── validator/
├── migrations/                     # file SQL migration (up/down)
├── seeds/                          # data awal (kurikulum)
├── .env.example
├── Dockerfile
├── go.mod
└── Makefile
```

### 10.4 Struktur Folder Frontend

```
frontend/
├── src/
│   ├── app/                        # router, providers, layout
│   ├── pages/                      # Landing, Login, Dashboard, PathDetail, Lesson, CheatSheet
│   ├── features/
│   │   ├── auth/
│   │   ├── learning-path/
│   │   ├── lesson/
│   │   ├── quiz/
│   │   ├── progress/
│   │   └── git-simulator/          # engine, parser command, validator, graph
│   │       ├── engine/             # state repo virtual + implementasi command
│   │       ├── components/         # Terminal, CommitGraph, TaskPanel
│   │       └── validators/         # cek state akhir per lesson
│   ├── components/                 # UI reusable (Button, Card, Modal, ProgressBar)
│   ├── hooks/
│   ├── services/                   # API client (axios/fetch)
│   ├── store/                      # state global (Zustand / Context)
│   ├── utils/
│   └── styles/
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

**Library yang disarankan (frontend):** React Router, TanStack Query (data fetching/cache), Zustand (state ringan), `react-markdown` (render lesson), React Flow atau SVG kustom (commit graph), `xterm.js` atau komponen terminal kustom, React Hook Form + Zod (validasi form).

---

## 11. Desain Database (MySQL)

### 11.1 Daftar Tabel

| Tabel | Kolom Utama |
|---|---|
| `users` | id, name, email (unique), password_hash, career_goal (frontend/backend), level, created_at |
| `learning_paths` | id, slug, title, description, order_no, track (core/collab/pro/frontend/backend) |
| `modules` | id, path_id (FK), title, description, order_no |
| `lessons` | id, module_id (FK), slug, title, content_md, estimated_minutes, order_no, practice_config (JSON), is_published |
| `quizzes` | id, lesson_id (FK), question, explanation |
| `quiz_options` | id, quiz_id (FK), option_text, is_correct |
| `user_lesson_progress` | id, user_id (FK), lesson_id (FK), status (not_started/in_progress/completed), practice_done, quiz_score, completed_at |
| `quiz_attempts` | id, user_id (FK), quiz_id (FK), selected_option_id, is_correct, attempted_at |
| `review_queue` | id, user_id (FK), quiz_id (FK), next_review_at, interval_days, ease |
| `user_stats` | user_id (FK), xp, current_streak, longest_streak, last_active_date |
| `badges` | id, code, name, description |
| `user_badges` | user_id (FK), badge_id (FK), earned_at |
| `cheatsheet_items` | id, category, command, description, example |

### 11.2 Relasi Utama
```
users 1─N user_lesson_progress N─1 lessons N─1 modules N─1 learning_paths
lessons 1─N quizzes 1─N quiz_options
users 1─N quiz_attempts N─1 quizzes
users 1─N review_queue N─1 quizzes
users 1─1 user_stats ; users N─N badges (via user_badges)
```

### 11.3 Catatan
- Index pada `users.email`, `lessons(module_id, order_no)`, `user_lesson_progress(user_id, lesson_id)` (unique).
- `practice_config` (JSON) menyimpan: state awal repo, tujuan tugas, kriteria validasi, daftar hint.
- Gunakan migration versioned (mis. `golang-migrate`).

---

## 12. Rancangan API (REST, prefix `/api/v1`)

### Auth
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/auth/register` | Daftar akun |
| POST | `/auth/login` | Login, return access token |
| POST | `/auth/refresh` | Perbarui token |
| GET | `/auth/me` | Profil pengguna saat ini |
| PATCH | `/users/me` | Update profil / career goal |

### Konten Belajar
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/paths` | Daftar learning path |
| GET | `/paths/:slug` | Detail path + modul + lesson (beserta status progress) |
| GET | `/lessons/:slug` | Detail lesson (konten, konfigurasi praktik) |
| GET | `/lessons/:slug/quizzes` | Soal kuis lesson |
| GET | `/cheatsheet` | Daftar command (query `?q=`) |

### Progress & Kuis
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/lessons/:slug/practice/complete` | Tandai praktik selesai |
| POST | `/quizzes/:id/answer` | Kirim jawaban, return benar/salah + penjelasan |
| POST | `/lessons/:slug/complete` | Tandai lesson selesai |
| GET | `/progress` | Ringkasan progress keseluruhan |
| GET | `/progress/next` | Rekomendasi lesson berikutnya |

### Engagement (Fase 2)
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/reviews/today` | Kuis yang perlu diulang hari ini |
| POST | `/reviews/:id/answer` | Jawab kuis review |
| GET | `/stats` | XP, streak, badge |

### Sistem
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/health` | Health check |

### Format Response Standar
```json
{
  "success": true,
  "message": "OK",
  "data": { },
  "error": null
}
```
Error:
```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "details": [ { "field": "email", "message": "invalid" } ] }
}
```

---

## 13. Desain Git Simulator (Komponen Inti)

### 13.1 Model State Repo Virtual
```
{
  commits:  { id → { id, message, parents[], timestamp } },
  branches: { name → commitId },
  HEAD:     { type: "branch" | "detached", ref },
  workingDir / stagingArea: { file → status },
  remotes:  { name → { branches } }    // untuk push/pull simulasi
}
```

### 13.2 Cakupan Command per Fase
- **MVP:** `init`, `status`, `add`, `commit`, `log`, `branch`, `switch/checkout`, `merge` (fast-forward & no-ff sederhana), `diff` (sederhana)
- **Fase 2:** `clone`, `remote`, `push`, `pull`, `fetch`, `reset`, `revert`, `restore`, `stash`, `tag`, simulasi conflict
- **Fase 3:** `rebase`, `rebase -i`, `cherry-pick`, `reflog`, `bisect`

### 13.3 Komponen
1. **Command Parser** — memecah input, memvalidasi sintaks, pesan error ramah.
2. **Execution Engine** — mengubah state repo virtual.
3. **Graph Renderer** — menggambar commit, branch label, HEAD secara animatif.
4. **Task Validator** — membandingkan state akhir dengan kriteria lesson.
5. **Hint System** — hint bertingkat.
6. **Error Translator** — menerjemahkan error Git menjadi penjelasan manusiawi ("Kenapa error ini muncul?").

### 13.4 Prinsip
- Engine murni (pure functions), mudah di-unit-test.
- Output meniru format Git asli supaya transfer ilmu ke terminal sungguhan terasa natural.

---

## 14. Desain UI/UX

### 14.1 Halaman Utama
| Halaman | Isi |
|---|---|
| Landing | Value proposition, preview simulator, CTA daftar |
| Login/Register | Form sederhana |
| Onboarding | Pilih target karier & level awal |
| Dashboard | Progress, lanjutkan lesson, streak, rekomendasi |
| Path Detail | Peta modul & lesson (roadmap visual) |
| **Lesson** | Layout split: **teori (kiri) • terminal + graph (kanan)**, kuis di bawah |
| Cheat Sheet | Pencarian + kategori command |
| Profil | Statistik, badge, sertifikat |

### 14.2 Prinsip UX
- Satu fokus per layar, hindari overload informasi.
- Feedback instan setiap command (graph bergerak, pesan jelas).
- Tombol **Reset sandbox** selalu terlihat.
- Warna konsisten untuk branch di graph.
- Dark mode dengan token warna Tailwind.
- Mobile: tab "Teori / Praktik" menggantikan split view.

---

## 15. Rencana Pengembangan (Roadmap)

| Fase | Durasi (perkiraan) | Deliverable |
|---|---|---|
| **0. Persiapan** | 1 minggu | Finalisasi PRD, wireframe, setup repo (monorepo/2 repo), CI dasar, konvensi kode |
| **1. Fondasi** | 2 minggu | Skeleton backend (layered), migration & seed awal, auth, layout frontend, design system Tailwind |
| **2. Konten & Progress** | 2 minggu | API path/lesson/quiz/progress, halaman path & lesson, render Markdown, kuis, progress tracking |
| **3. Git Simulator MVP** | 3 minggu | Engine + parser, commit graph, validator, hint, integrasi ke lesson |
| **4. Konten Kurikulum** | 2 minggu (paralel) | Tulis Jalur A (Fundamental) lengkap + kuis + cheat sheet |
| **5. QA & Beta** | 1–2 minggu | Testing, perbaikan bug, performa, aksesibilitas, beta tester |
| **6. Rilis MVP** | — | Deploy production |
| **7. Fase 2 (Engagement)** | 3–4 minggu | Challenge, spaced repetition, XP/streak/badge, sertifikat, Jalur B |
| **8. Fase 3 (Lanjutan)** | Menyusul | Jalur C, rebase/bisect, GitHub OAuth, admin CMS |

> Estimasi untuk 1–2 developer; sesuaikan dengan kapasitas.

---

## 16. Strategi Testing

| Level | Cakupan |
|---|---|
| Unit (Go) | Service layer dengan mock repository |
| Integration (Go) | Handler + repository dengan database MySQL test (Docker) |
| Unit (JS) | Engine Git simulator — setiap command punya test case |
| Component | React Testing Library untuk komponen kunci |
| E2E | Playwright/Cypress: register → lesson → praktik → kuis → progress |
| Manual / UAT | Uji dengan 5–10 pemula sungguhan, ukur waktu & kebingungan |

---

## 17. Deployment & DevOps

- **Containerization:** Docker (backend, MySQL untuk dev) + `docker-compose`.
- **CI (GitHub Actions):** lint, test, build untuk frontend & backend di setiap PR.
- **Environment:** `development`, `staging`, `production` (konfigurasi via env var).
- **Hosting contoh:** Frontend di Vercel/Netlify/Cloudflare Pages; Backend + MySQL di VPS atau platform container.
- **Migrasi DB:** dijalankan otomatis saat deploy.
- **Backup:** backup MySQL terjadwal.
- **Monitoring:** log terstruktur, health check, error tracking (mis. Sentry).

> Idealnya proyek ini sendiri dikelola dengan **workflow Git/GitHub profesional** (branch protection, PR, Conventional Commits) — sekaligus jadi contoh nyata untuk materi.

---

## 18. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Simulator tidak sama persis dengan Git asli | Miskonsepsi | Batasi cakupan, tandai jelas "simulasi", rujuk ke dokumentasi resmi |
| Cakupan simulator terlalu luas (rebase, conflict) | Jadwal molor | Rilis bertahap, MVP hanya command dasar |
| Konten kurikulum butuh waktu lama | Rilis tertunda | Tulis konten paralel, mulai dari Jalur A |
| Pengguna berhenti di tengah | Retensi rendah | Micro-lesson, streak, review, pengingat |
| Keamanan akun | Kebocoran data | Hash password, JWT pendek, rate limit, validasi ketat |
| Performa graph untuk banyak commit | UI lag | Batasi ukuran repo virtual per lesson, virtualisasi render |

---

## 19. Pertanyaan Terbuka

1. Apakah konten sepenuhnya berbahasa Indonesia, atau dwibahasa?
2. Apakah platform gratis penuh atau ada tier berbayar/sertifikat berbayar?
3. Apakah konten dikelola lewat file Markdown di repo (seed) atau langsung lewat Admin CMS sejak awal?
4. Perlu login sosial (Google/GitHub) sejak MVP atau cukup email + password?
5. Apakah pengguna anonim boleh mencoba lesson pertama tanpa daftar (untuk menaikkan konversi)?

---

## 20. Definisi Selesai (MVP)

- [ ] Pengguna bisa register, login, dan melihat dashboard.
- [ ] Jalur A (Git Fundamental) tersedia lengkap dengan lesson, praktik, dan kuis.
- [ ] Terminal simulator mendukung command MVP dengan visualisasi commit graph.
- [ ] Progress tersimpan dan bisa dilanjutkan dari lesson terakhir.
- [ ] Backend mengikuti layered architecture dengan test pada service layer.
- [ ] Deploy ke production dengan CI berjalan.
- [ ] Uji coba dengan minimal 5 pengguna pemula menunjukkan mereka dapat menyelesaikan modul 1–3.

---

## 21. Lampiran: Contoh Lesson (Referensi Format)

**Lesson: Staging Area — "Kenapa harus `git add` dulu?"**

- **Hook:** "Saya mengubah 5 file, tapi hanya ingin commit 2 di antaranya. Bagaimana?"
- **Analogi:** Staging area = *keranjang belanja*; commit = *checkout*.
- **Demo visual:** file bergerak dari Working Directory → Staging → Repository.
- **Praktik:** Buat 3 file, stage 2 file, commit; pastikan 1 file tetap `untracked`.
- **Kuis:** "Apa yang dilakukan `git add .`?" (4 opsi + penjelasan)
- **Ringkasan:** `status` → `add` → `commit`; cheat sheet.
