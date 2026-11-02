package domain

// FieldError describes a single validation failure.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// AppError is a transport-agnostic error carrying an HTTP status hint and a
// stable machine-readable code.
type AppError struct {
	Status  int
	Code    string
	Message string
	Details []FieldError
}

func (e *AppError) Error() string { return e.Message }

// NewError builds an AppError.
func NewError(status int, code, message string) *AppError {
	return &AppError{Status: status, Code: code, Message: message}
}

// ValidationError builds a 400 validation error.
func ValidationError(details ...FieldError) *AppError {
	return &AppError{
		Status:  400,
		Code:    "VALIDATION_ERROR",
		Message: "Validation failed",
		Details: details,
	}
}

var (
	ErrNotFound           = NewError(404, "NOT_FOUND", "Data tidak ditemukan")
	ErrEmailTaken         = NewError(409, "EMAIL_TAKEN", "Email sudah terdaftar")
	ErrInvalidCredentials = NewError(401, "INVALID_CREDENTIALS", "Email atau password salah")
	ErrUnauthorized       = NewError(401, "UNAUTHORIZED", "Autentikasi diperlukan")
	ErrInvalidToken       = NewError(401, "INVALID_TOKEN", "Token tidak valid atau sudah kedaluwarsa")
	ErrForbidden          = NewError(403, "FORBIDDEN", "Anda tidak memiliki akses")
	ErrPracticeRequired   = NewError(400, "PRACTICE_REQUIRED", "Selesaikan praktik terlebih dahulu")
	ErrQuizRequired       = NewError(400, "QUIZ_REQUIRED", "Jawab semua kuis terlebih dahulu")
	ErrLessonLocked       = NewError(403, "LESSON_LOCKED", "Selesaikan lesson sebelumnya terlebih dahulu")
	ErrInvalidOption      = NewError(400, "INVALID_OPTION", "Opsi jawaban tidak valid untuk kuis ini")
	ErrConflict           = NewError(409, "CONFLICT", "Konflik data")
	ErrInternal           = NewError(500, "INTERNAL_ERROR", "Terjadi kesalahan pada server")
)

// WrapValidation is a convenience for a one-field validation error.
func WrapValidation(field, message string) *AppError {
	return ValidationError(FieldError{Field: field, Message: message})
}
