package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/gitlearn/backend/internal/domain"
)

type badgeRepository struct {
	db *sql.DB
}

// NewBadgeRepository builds a MySQL badge repository.
func NewBadgeRepository(db *sql.DB) BadgeRepository {
	return &badgeRepository{db: db}
}

func (r *badgeRepository) ListDefinitions(ctx context.Context) ([]domain.Badge, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, code, name, description FROM badges ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	badges := make([]domain.Badge, 0)
	for rows.Next() {
		var b domain.Badge
		if err := rows.Scan(&b.ID, &b.Code, &b.Name, &b.Description); err != nil {
			return nil, err
		}
		badges = append(badges, b)
	}
	return badges, rows.Err()
}

func (r *badgeRepository) ListByUser(ctx context.Context, userID uint64) ([]domain.Badge, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT b.id, b.code, b.name, b.description, ub.earned_at
		 FROM user_badges ub
		 JOIN badges b ON b.id = ub.badge_id
		 WHERE ub.user_id = ?
		 ORDER BY ub.earned_at, b.id`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	badges := make([]domain.Badge, 0)
	for rows.Next() {
		var b domain.Badge
		var earned time.Time
		if err := rows.Scan(&b.ID, &b.Code, &b.Name, &b.Description, &earned); err != nil {
			return nil, err
		}
		b.EarnedAt = &earned
		badges = append(badges, b)
	}
	return badges, rows.Err()
}

func (r *badgeRepository) Award(ctx context.Context, userID, badgeID uint64, earnedAt time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE badge_id = badge_id`,
		userID, badgeID, earnedAt,
	)
	return err
}
