package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/service"
)

// CommunityHandler serves lesson discussions.
type CommunityHandler struct {
	community service.CommunityService
}

// NewCommunityHandler builds the community handler.
func NewCommunityHandler(community service.CommunityService) *CommunityHandler {
	return &CommunityHandler{community: community}
}

func (h *CommunityHandler) List(c *gin.Context) {
	items, err := h.community.List(c.Request.Context(), c.Param("slug"))
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, items)
}

func (h *CommunityHandler) Create(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	var req dto.CreateCommentRequest
	if !bindJSON(c, &req) || !validate(c, req) {
		return
	}
	comment, err := h.community.Create(c.Request.Context(), userID, c.Param("slug"), req.Content)
	if err != nil {
		handleError(c, err)
		return
	}
	response.Created(c, comment)
}

func (h *CommunityHandler) Delete(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	commentID, ok := uint64Param(c, "id")
	if !ok {
		return
	}
	if err := h.community.Delete(c.Request.Context(), userID, commentID); err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": true})
}
