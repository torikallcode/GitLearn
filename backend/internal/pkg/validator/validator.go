package validator

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gitlearn/backend/internal/domain"
)

var validate = newValidator()

func newValidator() *validator.Validate {
	v := validator.New()
	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "" || name == "-" {
			return fld.Name
		}
		return name
	})
	_ = v.RegisterValidation("careergoal", func(fl validator.FieldLevel) bool {
		switch fl.Field().String() {
		case "", domain.CareerFrontend, domain.CareerBackend:
			return true
		}
		return false
	})
	_ = v.RegisterValidation("level", func(fl validator.FieldLevel) bool {
		switch fl.Field().String() {
		case domain.LevelBeginner, domain.LevelIntermediate, domain.LevelAdvanced:
			return true
		}
		return false
	})
	return v
}

// Validate checks struct tags and converts failures into a domain validation
// error with per-field details.
func Validate(s any) *domain.AppError {
	err := validate.Struct(s)
	if err == nil {
		return nil
	}

	var errs validator.ValidationErrors
	if !asValidationErrors(err, &errs) {
		return domain.WrapValidation("body", err.Error())
	}

	details := make([]domain.FieldError, 0, len(errs))
	for _, fe := range errs {
		details = append(details, domain.FieldError{
			Field:   fe.Field(),
			Message: message(fe),
		})
	}
	return domain.ValidationError(details...)
}

func asValidationErrors(err error, target *validator.ValidationErrors) bool {
	if ve, ok := err.(validator.ValidationErrors); ok {
		*target = ve
		return true
	}
	return false
}

func message(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "wajib diisi"
	case "email":
		return "format email tidak valid"
	case "min":
		return fmt.Sprintf("minimal %s karakter", fe.Param())
	case "max":
		return fmt.Sprintf("maksimal %s karakter", fe.Param())
	case "careergoal":
		return "harus salah satu dari: frontend, backend, atau kosong"
	case "level":
		return "harus salah satu dari: beginner, intermediate, advanced"
	case "oneof":
		return fmt.Sprintf("harus salah satu dari: %s", fe.Param())
	default:
		return "nilai tidak valid"
	}
}
