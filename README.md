# GitLearn

Platform belajar Git & GitHub interaktif berbahasa Indonesia. Belajar lewat teori singkat, terminal simulator di
browser, commit graph real-time, dan kuis — tanpa risiko merusak repository.

## Stack

| Bagian | Teknologi |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, TanStack Query, Zustand |
| Simulator | Engine JavaScript murni (parser, state repo virtual, validator, graph) |
| Backend | Go 1.22, Gin, MySQL, JWT, bcrypt — layered architecture |
| Infra | Docker, docker-compose, GitHub Actions CI |

## Fitur

- Autentikasi JWT (register, login, refresh, profil, career goal).
- Katalog 5 jalur: Fundamental, GitHub Collaboration, Profesional, Frontend, Backend (46 lesson).
- Lesson split-view: teori Markdown + terminal simulator + commit graph + hint bertingkat.
- 25+ command Git disimulasikan: `init` → `merge`, `rebase`, `reflog`, `bisect`, `stash`, dan lainnya.
- Validasi praktik berbasis state repo, reset sandbox kapan saja.
- Kuis dengan penjelasan, skor, dan spaced repetition untuk jawaban salah.
- Progress tracking, sequential unlock, XP, streak, badge, dan sertifikat (cetak/PDF).
- Pencarian lesson/command, cheat sheet, dark mode, responsive + aksesibilitas dasar.

## Menjalankan

### Docker (paling cepat)

```bash
cp backend/.env.example backend/.env   # opsional, ubah JWT_SECRET
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:8080/api/v1/health
- MySQL: localhost:3306 (user/password `gitlearn`)

Migrasi + seed kurikulum dijalankan otomatis oleh container API.

### Manual

```bash
# 1. Database
mysql -u root -p -e "CREATE DATABASE gitlearn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER 'gitlearn'@'localhost' IDENTIFIED BY 'gitlearn'; GRANT ALL ON gitlearn.* TO 'gitlearn'@'localhost';"

# 2. Backend
cd backend
cp .env.example .env
go run ./cmd/migrate up
go run ./cmd/seed
go run ./cmd/api

# 3. Frontend (terminal baru)
cd frontend
npm install
npm run dev
```

Vite mem-proxy `/api` ke `http://localhost:8080`.

## Testing

```bash
cd backend && go test ./...
cd frontend && npm test && npm run build
```

CI (`.github/workflows/ci.yml`) menjalankan vet, unit test Go, unit test engine simulator, build frontend, dan build
Docker.

## Struktur

```
backend/
  cmd/{api,migrate,seed}/     # entry point
  internal/{config,domain,dto,handler,service,repository,middleware,router,pkg}/
  migrations/                 # SQL versioned
  seeds/                      # kurikulum JSON (Bahasa Indonesia)
frontend/
  src/app/                    # router, layout, search
  src/pages/                  # landing, auth, dashboard, path, lesson, review, certificate
  src/features/git-simulator/ # engine + terminal + graph + task panel
  src/features/quiz/          # quiz runner
  src/components/             # UI reusable
docs/                         # API, schema seed, kontrak simulator
```

## Dokumentasi

- [`docs/API.md`](docs/API.md) — kontrak REST `/api/v1`.
- [`docs/SEED-SCHEMA.md`](docs/SEED-SCHEMA.md) — format kurikulum & tipe validasi praktik.
- [`docs/SIMULATOR-CONTRACT.md`](docs/SIMULATOR-CONTRACT.md) — API engine simulator.
- [`backend/README.md`](backend/README.md) — setup backend, migrasi, endpoint.

## Catatan cakupan

MVP dan Fase 2 (engagement) diimplementasikan penuh. Beberapa item Fase 3 disertakan: pencarian, dark mode, explain
command, sertifikat, dan latihan command lanjutan (`rebase`, `bisect`, `reflog`, `cherry-pick`). Integrasi GitHub OAuth
langsung ke repo pengguna, leaderboard/komunitas, dan admin CMS tetap berada di roadmap karena membutuhkan layanan
eksternal di luar sandbox.
