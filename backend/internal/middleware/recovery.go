package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/pkg/response"
)

// Recovery converts panics into a logged 500 envelope.
func Recovery(logger *slog.Logger) gin.HandlerFunc {
	if logger == nil {
		logger = slog.Default()
	}
	return func(c *gin.Context) {
		defer func() {
			if rec := recover(); rec != nil {
				logger.Error("panic recovered",
					"error", rec,
					"path", c.Request.URL.Path,
					"method", c.Request.Method,
					"stack", string(debug.Stack()),
				)
				if c.Writer.Written() {
					c.Abort()
					return
				}
				response.Abort(c, http.StatusInternalServerError, "Terjadi kesalahan pada server", "INTERNAL_ERROR")
			}
		}()
		c.Next()
	}
}
