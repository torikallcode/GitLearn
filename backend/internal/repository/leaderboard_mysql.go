package repository

import (
	"context"
	"database/sql"

	"github.com/gitlearn/backend/internal/domain"
)

type leaderboardRepository struct {
	db *sql.DB
}

// NewLeaderboardRepository builds a MySQL leaderboard repository.
func NewLeaderboardRepository(db *sql.DB) LeaderboardRepository {
	return &leaderboardRepository{db: db}
}

func (r *leaderboardRepository) TopXP(ctx context.Context, limit int) ([]domain.LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT u.id, u.name, s.xp, s.current_streak, s.longest_streak
		 FROM user_stats s
		 JOIN users u ON u.id = s.user_id
		 ORDER BY s.xp DESC, s.current_streak DESC, u.id ASC
		 LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.LeaderboardEntry, 0)
	rank := 0
	for rows.Next() {
		var e domain.LeaderboardEntry
		if err := rows.Scan(&e.UserID, &e.Name, &e.XP, &e.CurrentStreak, &e.LongestStreak); err != nil {
			return nil, err
		}
		rank++
		e.Rank = rank
		out = append(out, e)
	}
	return out, rows.Err()
}
