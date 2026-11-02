package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/service"
)

// QuizHandler handles answer submission and daily reviews.
type QuizHandler struct {
	quiz service.QuizService
}

// NewQuizHandler builds the quiz handler.
func NewQuizHandler(quiz service.QuizService) *QuizHandler {
	return &QuizHandler{quiz: quiz}
}

func (h *QuizHandler) Answer(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	quizID, ok := uint64Param(c, "id")
	if !ok {
		return
	}
	var req dto.QuizAnswerRequest
	if !bindJSON(c, &req) || !validate(c, req) {
		return
	}
	res, err := h.quiz.Answer(c.Request.Context(), userID, quizID, req.OptionID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, res)
}

func (h *QuizHandler) ReviewsToday(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	items, err := h.quiz.ReviewsToday(c.Request.Context(), userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, items)
}

func (h *QuizHandler) AnswerReview(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}
	reviewID, ok := uint64Param(c, "id")
	if !ok {
		return
	}
	var req dto.QuizAnswerRequest
	if !bindJSON(c, &req) || !validate(c, req) {
		return
	}
	res, err := h.quiz.AnswerReview(c.Request.Context(), userID, reviewID, req.OptionID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, res)
}
