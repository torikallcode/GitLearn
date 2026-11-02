package handler

import (
	"errors"
	"io"
	"log/slog"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/middleware"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/pkg/validator"
)

func handleError(c *gin.Context, err error) {
	var appErr *domain.AppError
	if errors.As(err, &appErr) {
		details := make([]dto.ErrorDetail, 0, len(appErr.Details))
		for _, d := range appErr.Details {
			details = append(details, dto.ErrorDetail{Field: d.Field, Message: d.Message})
		}
		response.Error(c, appErr.Status, appErr.Message, appErr.Code, details)
		return
	}
	slog.Error("unhandled request error", "error", err, "path", c.Request.URL.Path)
	response.Error(c, 500, "Terjadi kesalahan pada server", "INTERNAL_ERROR", nil)
}

func bindJSON(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		response.Error(c, 400, "Request body tidak valid", "VALIDATION_ERROR", nil)
		return false
	}
	return true
}

// bindOptionalJSON tolerates an empty body for endpoints whose body is optional.
func bindOptionalJSON(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil && !errors.Is(err, io.EOF) {
		response.Error(c, 400, "Request body tidak valid", "VALIDATION_ERROR", nil)
		return false
	}
	return true
}

func validate(c *gin.Context, payload any) bool {
	if appErr := validator.Validate(payload); appErr != nil {
		handleError(c, appErr)
		return false
	}
	return true
}

func optionalUserID(c *gin.Context) *uint64 {
	id, ok := middleware.UserID(c)
	if !ok {
		return nil
	}
	return &id
}

func requireUserID(c *gin.Context) (uint64, bool) {
	id, ok := middleware.UserID(c)
	if !ok {
		response.Abort(c, 401, "Autentikasi diperlukan", "UNAUTHORIZED")
		return 0, false
	}
	return id, true
}

func uint64Param(c *gin.Context, name string) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil || id == 0 {
		response.Error(c, 400, "Parameter tidak valid", "VALIDATION_ERROR",
			[]dto.ErrorDetail{{Field: name, Message: "harus berupa angka positif"}})
		return 0, false
	}
	return id, true
}
