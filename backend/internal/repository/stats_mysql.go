package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/gitlearn/backend/internal/domain"
)

type statsRepository struct {
	db *sql.DB
}

// NewStatsRepository builds a MySQL stats repository.
func NewStatsRepository(db *sql.DB) StatsRepository {
	return &statsRepository{db: db}
}

func (r *statsRepository) Get(ctx context.Context, userID uint64) (*domain.Stats, error) {
	var (
		s        domain.Stats
		lastSeen sql.NullTime
	)
	err := r.db.QueryRowContext(ctx,
		`SELECT user_id, xp, current_streak, longest_streak, last_active_date, updated_at
		 FROM user_stats WHERE user_id = ?`, userID,
	).Scan(&s.UserID, &s.XP, &s.CurrentStreak, &s.LongestStreak, &lastSeen, &s.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if lastSeen.Valid {
		t := lastSeen.Time
		s.LastActiveDate = &t
	}
	return &s, nil
}

func (r *statsRepository) Save(ctx context.Context, s *domain.Stats) error {
	var last any
	if s.LastActiveDate != nil {
		last = *s.LastActiveDate
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO user_stats (user_id, xp, current_streak, longest_streak, last_active_date)
		 VALUES (?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   xp = VALUES(xp),
		   current_streak = VALUES(current_streak),
		   longest_streak = VALUES(longest_streak),
		   last_active_date = VALUES(last_active_date)`,
		s.UserID, s.XP, s.CurrentStreak, s.LongestStreak, last,
	)
	if err != nil {
		return err
	}
	s.UpdatedAt = time.Now().UTC()
	return nil
}
