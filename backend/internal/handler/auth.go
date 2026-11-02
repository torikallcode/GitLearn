package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/service"
)

// AuthHandler handles registration, authentication and profile endpoints.
type AuthHandler struct {
	auth service.AuthService
}

// NewAuthHandler builds the auth handler.
func NewAuthHandler(auth service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if !bindJSON(c, &req) || !validate(c, req) {
		return
	}
	res, err := h.auth.Register(c.Request.Context(), req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.Created(c, res)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if !bindJSON(c, &req) || !validate(c, req) {
		return
	}
	res, err := h.auth.Login(c.Request.Context(), req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, res)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req dto.RefreshRequest
	if !bindJSON(c, &req) || !validate(c, req) {
		return
	}
	res, err := h.auth.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, res)
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	user, err := h.auth.Me(c.Request.Context(), userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, user)
}

func (h *AuthHandler) UpdateMe(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	var req dto.UpdateProfileRequest
	if !bindJSON(c, &req) || !validate(c, req) {
		return
	}
	user, err := h.auth.UpdateProfile(c.Request.Context(), userID, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, user)
}
