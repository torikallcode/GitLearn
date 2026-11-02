package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/service"
)

// ContentHandler serves the public catalog endpoints.
type ContentHandler struct {
	content service.ContentService
}

// NewContentHandler builds the content handler.
func NewContentHandler(content service.ContentService) *ContentHandler {
	return &ContentHandler{content: content}
}

func (h *ContentHandler) ListPaths(c *gin.Context) {
	paths, err := h.content.ListPaths(c.Request.Context(), optionalUserID(c))
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, paths)
}

func (h *ContentHandler) GetPath(c *gin.Context) {
	detail, err := h.content.GetPath(c.Request.Context(), c.Param("slug"), optionalUserID(c))
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, detail)
}

func (h *ContentHandler) GetLesson(c *gin.Context) {
	lesson, err := h.content.GetLesson(c.Request.Context(), c.Param("slug"), optionalUserID(c))
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, lesson)
}

func (h *ContentHandler) ListQuizzes(c *gin.Context) {
	quizzes, err := h.content.ListQuizzes(c.Request.Context(), c.Param("slug"))
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, quizzes)
}

func (h *ContentHandler) Cheatsheet(c *gin.Context) {
	items, err := h.content.Cheatsheet(c.Request.Context(), c.Query("q"))
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, items)
}

func (h *ContentHandler) Search(c *gin.Context) {
	result, err := h.content.Search(c.Request.Context(), c.Query("q"))
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}
