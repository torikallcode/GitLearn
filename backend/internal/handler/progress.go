package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/service"
)

// ProgressHandler handles practice, completion and progress reports.
type ProgressHandler struct {
	progress service.ProgressService
}

// NewProgressHandler builds the progress handler.
func NewProgressHandler(progress service.ProgressService) *ProgressHandler {
	return &ProgressHandler{progress: progress}
}

func (h *ProgressHandler) CompletePractice(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	res, err := h.progress.CompletePractice(c.Request.Context(), userID, c.Param("slug"))
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, res)
}

func (h *ProgressHandler) CompleteLesson(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	var req dto.CompleteLessonRequest
	if !bindOptionalJSON(c, &req) {
		return
	}
	res, err := h.progress.CompleteLesson(c.Request.Context(), userID, c.Param("slug"))
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, res)
}

func (h *ProgressHandler) Get(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	res, err := h.progress.GetProgress(c.Request.Context(), userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, res)
}

func (h *ProgressHandler) Next(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	next, err := h.progress.Next(c.Request.Context(), userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, next)
}
