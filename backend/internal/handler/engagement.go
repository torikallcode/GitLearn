package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/service"
)

// EngagementHandler handles gamification and certificate endpoints.
type EngagementHandler struct {
	engagement service.EngagementService
}

// NewEngagementHandler builds the engagement handler.
func NewEngagementHandler(engagement service.EngagementService) *EngagementHandler {
	return &EngagementHandler{engagement: engagement}
}

func (h *EngagementHandler) Stats(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	stats, err := h.engagement.Stats(c.Request.Context(), userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, stats)
}

func (h *EngagementHandler) Certificate(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	cert, err := h.engagement.Certificate(c.Request.Context(), userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, cert)
}
