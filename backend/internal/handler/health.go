package handler

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/pkg/response"
)

// HealthHandler reports service and database liveness.
type HealthHandler struct {
	db *sql.DB
}

// NewHealthHandler builds the health handler.
func NewHealthHandler(db *sql.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

func (h *HealthHandler) Check(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	if err := h.db.PingContext(ctx); err != nil {
		slog.Warn("health check failed", "error", err)
		response.Error(c, 503, "Database tidak tersedia", "DB_UNAVAILABLE", nil)
		return
	}
	response.OK(c, dto.Health{
		Status: "ok",
		Time:   time.Now().UTC(),
		DB:     "up",
	})
}
