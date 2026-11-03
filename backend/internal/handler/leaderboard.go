package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/service"
)

// LeaderboardHandler serves the public XP ranking.
type LeaderboardHandler struct {
	leaderboard service.LeaderboardService
}

// NewLeaderboardHandler builds the leaderboard handler.
func NewLeaderboardHandler(leaderboard service.LeaderboardService) *LeaderboardHandler {
	return &LeaderboardHandler{leaderboard: leaderboard}
}

func (h *LeaderboardHandler) Top(c *gin.Context) {
	limit, _ := strconv.Atoi(c.Query("limit"))
	items, err := h.leaderboard.Top(c.Request.Context(), limit)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, items)
}
