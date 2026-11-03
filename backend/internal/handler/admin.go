package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/service"
)

// AdminHandler serves the lesson/quiz CMS.
type AdminHandler struct {
	admin service.AdminService
}

// NewAdminHandler builds the admin handler.
func NewAdminHandler(admin service.AdminService) *AdminHandler {
	return &AdminHandler{admin: admin}
}

func (h *AdminHandler) ListLessons(c *gin.Context) {
	items, err := h.admin.ListLessons(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, items)
}

func (h *AdminHandler) GetLesson(c *gin.Context) {
	id, ok := uint64Param(c, "id")
	if !ok {
		return
	}
	lesson, err := h.admin.GetLesson(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, lesson)
}

func (h *AdminHandler) UpdateLesson(c *gin.Context) {
	id, ok := uint64Param(c, "id")
	if !ok {
		return
	}
	var req dto.UpdateLessonRequest
	if !bindOptionalJSON(c, &req) || !validate(c, req) {
		return
	}
	lesson, err := h.admin.UpdateLesson(c.Request.Context(), id, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, lesson)
}

func (h *AdminHandler) ListQuizzes(c *gin.Context) {
	id, ok := uint64Param(c, "id")
	if !ok {
		return
	}
	items, err := h.admin.ListQuizzes(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, items)
}

func (h *AdminHandler) CreateQuiz(c *gin.Context) {
	id, ok := uint64Param(c, "id")
	if !ok {
		return
	}
	var req dto.QuizUpsertRequest
	if !bindJSON(c, &req) || !validate(c, req) {
		return
	}
	quiz, err := h.admin.CreateQuiz(c.Request.Context(), id, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.Created(c, quiz)
}

func (h *AdminHandler) UpdateQuiz(c *gin.Context) {
	id, ok := uint64Param(c, "id")
	if !ok {
		return
	}
	var req dto.QuizUpsertRequest
	if !bindJSON(c, &req) || !validate(c, req) {
		return
	}
	quiz, err := h.admin.UpdateQuiz(c.Request.Context(), id, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, quiz)
}

func (h *AdminHandler) DeleteQuiz(c *gin.Context) {
	id, ok := uint64Param(c, "id")
	if !ok {
		return
	}
	if err := h.admin.DeleteQuiz(c.Request.Context(), id); err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": true})
}
