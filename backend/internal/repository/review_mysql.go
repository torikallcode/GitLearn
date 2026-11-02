package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/gitlearn/backend/internal/domain"
)

type reviewRepository struct {
	db *sql.DB
}

// NewReviewRepository builds a MySQL spaced-repetition repository.
func NewReviewRepository(db *sql.DB) ReviewRepository {
	return &reviewRepository{db: db}
}

const reviewSelect = `
	SELECT r.id, r.user_id, r.quiz_id, r.next_review_at, r.interval_days, r.ease, r.created_at,
	       q.question, l.id, l.slug, l.title
	FROM review_queue r
	JOIN quizzes q ON q.id = r.quiz_id
	JOIN lessons l ON l.id = q.lesson_id`

func (r *reviewRepository) ListDue(ctx context.Context, userID uint64, now time.Time) ([]domain.ReviewItem, error) {
	rows, err := r.db.QueryContext(ctx, reviewSelect+`
		WHERE r.user_id = ? AND r.next_review_at <= ?
		ORDER BY r.next_review_at, r.id`, userID, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.ReviewItem, 0)
	for rows.Next() {
		item, err := scanReview(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *reviewRepository) GetForUser(ctx context.Context, reviewID, userID uint64) (*domain.ReviewItem, error) {
	return scanReview(r.db.QueryRowContext(ctx, reviewSelect+`
		WHERE r.id = ? AND r.user_id = ?`, reviewID, userID))
}

func (r *reviewRepository) Upsert(ctx context.Context, item *domain.ReviewItem) error {
	if item.Ease <= 0 {
		item.Ease = 2.5
	}
	if item.IntervalDays <= 0 {
		item.IntervalDays = 1
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO review_queue (user_id, quiz_id, next_review_at, interval_days, ease)
		 VALUES (?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   next_review_at = VALUES(next_review_at),
		   interval_days = VALUES(interval_days),
		   ease = VALUES(ease),
		   updated_at = CURRENT_TIMESTAMP`,
		item.UserID, item.QuizID, item.NextReviewAt, item.IntervalDays, item.Ease,
	)
	return err
}

func (r *reviewRepository) UpdateSchedule(ctx context.Context, reviewID, userID uint64, intervalDays int, ease float64, next time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE review_queue
		 SET interval_days = ?, ease = ?, next_review_at = ?, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ? AND user_id = ?`,
		intervalDays, ease, next, reviewID, userID,
	)
	return err
}

func scanReview(row rowScanner) (*domain.ReviewItem, error) {
	var item domain.ReviewItem
	err := row.Scan(&item.ID, &item.UserID, &item.QuizID, &item.NextReviewAt, &item.IntervalDays,
		&item.Ease, &item.CreatedAt, &item.Question, &item.LessonID, &item.LessonSlug, &item.LessonTitle)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}
