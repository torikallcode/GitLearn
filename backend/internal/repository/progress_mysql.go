package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/gitlearn/backend/internal/domain"
)

type progressRepository struct {
	db *sql.DB
}

// NewProgressRepository builds a MySQL progress repository.
func NewProgressRepository(db *sql.DB) ProgressRepository {
	return &progressRepository{db: db}
}

func (r *progressRepository) Get(ctx context.Context, userID, lessonID uint64) (*domain.Progress, error) {
	var (
		p           domain.Progress
		completedAt sql.NullTime
	)
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, lesson_id, status, practice_done, quiz_score, completed_at, created_at, updated_at
		 FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?`, userID, lessonID,
	).Scan(&p.ID, &p.UserID, &p.LessonID, &p.Status, &p.PracticeDone, &p.QuizScore, &completedAt, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if completedAt.Valid {
		t := completedAt.Time
		p.CompletedAt = &t
	}
	return &p, nil
}

func (r *progressRepository) ListByUser(ctx context.Context, userID uint64) ([]domain.Progress, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, lesson_id, status, practice_done, quiz_score, completed_at, created_at, updated_at
		 FROM user_lesson_progress WHERE user_id = ? ORDER BY id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.Progress, 0)
	for rows.Next() {
		var (
			p           domain.Progress
			completedAt sql.NullTime
		)
		if err := rows.Scan(&p.ID, &p.UserID, &p.LessonID, &p.Status, &p.PracticeDone, &p.QuizScore,
			&completedAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if completedAt.Valid {
			t := completedAt.Time
			p.CompletedAt = &t
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *progressRepository) Save(ctx context.Context, p *domain.Progress) error {
	var completedAt any
	if p.CompletedAt != nil {
		completedAt = *p.CompletedAt
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO user_lesson_progress (user_id, lesson_id, status, practice_done, quiz_score, completed_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   status = VALUES(status),
		   practice_done = VALUES(practice_done),
		   quiz_score = VALUES(quiz_score),
		   completed_at = VALUES(completed_at),
		   updated_at = CURRENT_TIMESTAMP`,
		p.UserID, p.LessonID, p.Status, p.PracticeDone, p.QuizScore, completedAt,
	)
	if err != nil {
		return err
	}
	if id, err := res.LastInsertId(); err == nil && id > 0 && p.ID == 0 {
		p.ID = uint64(id)
	}
	return nil
}
