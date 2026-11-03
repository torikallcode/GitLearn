package service

import (
	"context"

	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/repository"
)

// LeaderboardService exposes the public XP ranking.
type LeaderboardService interface {
	Top(ctx context.Context, limit int) ([]dto.LeaderboardEntry, error)
}

type leaderboardService struct {
	board repository.LeaderboardRepository
}

// NewLeaderboardService builds the leaderboard service.
func NewLeaderboardService(board repository.LeaderboardRepository) LeaderboardService {
	return &leaderboardService{board: board}
}

func (s *leaderboardService) Top(ctx context.Context, limit int) ([]dto.LeaderboardEntry, error) {
	items, err := s.board.TopXP(ctx, limit)
	if err != nil {
		return nil, err
	}
	out := make([]dto.LeaderboardEntry, 0, len(items))
	for _, e := range items {
		out = append(out, dto.LeaderboardEntry{
			Rank:          e.Rank,
			UserID:        e.UserID,
			Name:          e.Name,
			XP:            e.XP,
			CurrentStreak: e.CurrentStreak,
			LongestStreak: e.LongestStreak,
		})
	}
	return out, nil
}
