package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/pkg/jwt"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/repository"
)

// Admin requires a valid token whose user has the admin role.
func Admin(tokens *jwt.Manager, users repository.UserRepository) gin.HandlerFunc {
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
		user, err := users.GetByID(c.Request.Context(), userID)
		if err != nil {
			response.Abort(c, 401, "Autentikasi diperlukan", "UNAUTHORIZED")
			return
		}
		if user.Role != domain.RoleAdmin {
			response.Abort(c, 403, "Anda tidak memiliki akses", "FORBIDDEN")
			return
		}
		c.Set(contextUserID, userID)
		c.Next()
	}
}
