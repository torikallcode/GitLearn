# GitLearn Backend

GitLearn backend MVP.

## Setup
1. Copy `.env.example` to `.env` (API, migrate, and seed load it automatically).
2. Ensure MySQL is running and the database/user in `DB_DSN` exist.
3. Run `make migrate-up`.
4. Run `make seed`.
5. Run `make run`.

## Commands
- `make run` - Start API server.
- `make build` - Build binaries.
- `make test` - Run unit tests.
- `make migrate-up` - Run migrations.
- `make seed` - Seed curriculum.

## Endpoints (API V1)
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/github` (OAuth, opsional)
- `GET /api/v1/paths`
- `GET /api/v1/lessons/:slug`
- `GET /api/v1/cheatsheet`
- `POST /api/v1/lessons/:slug/practice/complete`
- `POST /api/v1/lessons/:slug/complete`
- `GET /api/v1/progress`
- `GET /api/v1/reviews/today`
- `GET /api/v1/leaderboard`
- `GET /api/v1/lessons/:slug/comments` · `POST` (auth)
- `DELETE /api/v1/comments/:id` (auth)
- `GET/PATCH /api/v1/admin/lessons[/:id]` (admin)
- `GET/POST /api/v1/admin/lessons/:id/quizzes` (admin)
- `PATCH/DELETE /api/v1/admin/quizzes/:id` (admin)
- `GET /api/v1/health`
