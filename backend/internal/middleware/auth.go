package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/pkg/jwt"
	"github.com/gitlearn/backend/internal/pkg/response"
)

const contextUserID = "user_id"

// Auth requires a valid Bearer access token.
func Auth(tokens *jwt.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, ok := bearerToken(c)
		if !ok {
			response.Abort(c, 401, "Autentikasi diperlukan", "UNAUTHORIZED")
			return
		}
		userID, err := tokens.ParseAccess(token)
		if err != nil {
			response.Abort(c, 401, "Token tidak valid atau sudah kedaluwarsa", "INVALID_TOKEN")
			return
		}
		c.Set(contextUserID, userID)
		c.Next()
	}
}

// Optional attaches the user id when a valid Bearer token is present and
// otherwise lets the request continue anonymously.
func Optional(tokens *jwt.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		if token, ok := bearerToken(c); ok {
			if userID, err := tokens.ParseAccess(token); err == nil {
				c.Set(contextUserID, userID)
			}
		}
		c.Next()
	}
}

// UserID returns the authenticated user id, if any.
func UserID(c *gin.Context) (uint64, bool) {
	v, exists := c.Get(contextUserID)
	if !exists {
		return 0, false
	}
	id, ok := v.(uint64)
	return id, ok
}

func bearerToken(c *gin.Context) (string, bool) {
	header := strings.TrimSpace(c.GetHeader("Authorization"))
	parts := strings.Fields(header)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", false
	}
	return parts[1], true
}
