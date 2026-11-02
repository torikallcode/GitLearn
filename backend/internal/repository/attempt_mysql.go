package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/gitlearn/backend/internal/domain"
)

type attemptRepository struct {
	db *sql.DB
}

// NewAttemptRepository builds a MySQL quiz attempt repository.
func NewAttemptRepository(db *sql.DB) AttemptRepository {
	return &attemptRepository{db: db}
}

func (r *attemptRepository) Create(ctx context.Context, a *domain.QuizAttempt) error {
	if a.AttemptedAt.IsZero() {
		a.AttemptedAt = time.Now().UTC()
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO quiz_attempts (user_id, quiz_id, selected_option_id, is_correct, attempted_at)
		 VALUES (?, ?, ?, ?, ?)`,
		a.UserID, a.QuizID, a.SelectedOptionID, a.IsCorrect, a.AttemptedAt,
	)
	if err != nil {
		return err
	}
	if id, err := res.LastInsertId(); err == nil {
		a.ID = uint64(id)
	}
	return nil
}

func (r *attemptRepository) CountDistinctCorrectByLesson(ctx context.Context, userID, lessonID uint64) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT qa.quiz_id)
		 FROM quiz_attempts qa
		 JOIN quizzes q ON q.id = qa.quiz_id
		 WHERE qa.user_id = ? AND qa.is_correct = 1 AND q.lesson_id = ?`,
		userID, lessonID,
	).Scan(&count)
	return count, err
}

func (r *attemptRepository) CountDistinctAnsweredByLesson(ctx context.Context, userID, lessonID uint64) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT qa.quiz_id)
		 FROM quiz_attempts qa
		 JOIN quizzes q ON q.id = qa.quiz_id
		 WHERE qa.user_id = ? AND q.lesson_id = ?`,
		userID, lessonID,
	).Scan(&count)
	return count, err
}
