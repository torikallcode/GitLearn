package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/dto"
)

type envelope struct {
	Success bool             `json:"success"`
	Message string           `json:"message"`
	Data    any              `json:"data"`
	Error   *dto.ErrorBody   `json:"error"`
}

// OK writes a 200 success envelope.
func OK(c *gin.Context, data any) {
	Success(c, http.StatusOK, "OK", data)
}

// Created writes a 201 success envelope.
func Created(c *gin.Context, data any) {
	Success(c, http.StatusCreated, "Created", data)
}

// Success writes an arbitrary success envelope.
func Success(c *gin.Context, status int, message string, data any) {
	c.JSON(status, envelope{Success: true, Message: message, Data: data})
}

// Error writes an error envelope.
func Error(c *gin.Context, status int, message, code string, details []dto.ErrorDetail) {
	c.JSON(status, envelope{
		Success: false,
		Message: message,
		Data:    nil,
		Error:   &dto.ErrorBody{Code: code, Details: details},
	})
}

// Abort writes an error envelope and stops the middleware chain.
func Abort(c *gin.Context, status int, message, code string) {
	c.AbortWithStatusJSON(status, envelope{
		Success: false,
		Message: message,
		Data:    nil,
		Error:   &dto.ErrorBody{Code: code},
	})
}
