package dto

import (
	"encoding/json"
	"time"
)

// ErrorDetail matches the documented error details entry.
type ErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ErrorBody is the `error` member of the response envelope.
type ErrorBody struct {
	Code    string        `json:"code"`
	Details []ErrorDetail `json:"details,omitempty"`
}

// User is the public user projection.
type User struct {
	ID         uint64    `json:"id"`
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	CareerGoal string    `json:"career_goal"`
	Level      string    `json:"level"`
	CreatedAt  time.Time `json:"created_at"`
	Stats      Stats     `json:"stats"`
}

// Stats is the nested gamification summary.
type Stats struct {
	XP             int     `json:"xp"`
	CurrentStreak  int     `json:"current_streak"`
	LongestStreak  int     `json:"longest_streak"`
	LastActiveDate *string `json:"last_active_date"`
}

// StatsResponse is returned by GET /stats and includes earned badges.
type StatsResponse struct {
	Stats
	Badges []Badge `json:"badges"`
}

// Badge is an achievement, optionally dated when earned by the user.
type Badge struct {
	Code        string     `json:"code"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	EarnedAt    *time.Time `json:"earned_at,omitempty"`
}

// RegisterRequest is POST /auth/register.
type RegisterRequest struct {
	Name       string `json:"name" validate:"required,min=2,max=120"`
	Email      string `json:"email" validate:"required,email,max=190"`
	Password   string `json:"password" validate:"required,min=8,max=72"`
	CareerGoal string `json:"career_goal" validate:"omitempty,careergoal"`
	Level      string `json:"level" validate:"omitempty,level"`
}

// LoginRequest is POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// RefreshRequest is POST /auth/refresh.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// UpdateProfileRequest is PATCH /users/me. Absent fields are left unchanged.
type UpdateProfileRequest struct {
	Name       *string `json:"name" validate:"omitempty,min=2,max=120"`
	CareerGoal *string `json:"career_goal" validate:"omitempty,careergoal"`
	Level      *string `json:"level" validate:"omitempty,level"`
}

// AuthResponse is returned by register/login.
type AuthResponse struct {
	User         User   `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// RefreshResponse is returned by refresh.
type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// PathSummary is the path projection used in catalog and detail responses.
type PathSummary struct {
	ID               uint64 `json:"id"`
	Slug             string `json:"slug"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	OrderNo          int    `json:"order_no"`
	Track            string `json:"track"`
	ModuleCount      int    `json:"module_count"`
	LessonCount      int    `json:"lesson_count"`
	CompletedLessons int    `json:"completed_lessons"`
	ProgressPercent  int    `json:"progress_percent"`
}

// LessonSummary is a lesson row inside a module.
type LessonSummary struct {
	ID               uint64 `json:"id"`
	Slug             string `json:"slug"`
	Title            string `json:"title"`
	EstimatedMinutes int    `json:"estimated_minutes"`
	OrderNo          int    `json:"order_no"`
	Status           string `json:"status"`
	PracticeDone     bool   `json:"practice_done"`
	QuizScore        int    `json:"quiz_score"`
	QuizTotal        int    `json:"quiz_total"`
	Locked           bool   `json:"locked"`
}

// ModuleSummary is a module with its lessons and progress.
type ModuleSummary struct {
	ID               uint64          `json:"id"`
	Title            string          `json:"title"`
	Description      string          `json:"description"`
	OrderNo          int             `json:"order_no"`
	LessonCount      int             `json:"lesson_count"`
	CompletedLessons int             `json:"completed_lessons"`
	ProgressPercent  int             `json:"progress_percent"`
	Lessons          []LessonSummary `json:"lessons"`
}

// PathDetail is GET /paths/:slug.
type PathDetail struct {
	Path    PathSummary     `json:"path"`
	Modules []ModuleSummary `json:"modules"`
}

// LessonPath is the path fragment inside a lesson detail.
type LessonPath struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
}

// LessonModule is the module fragment inside a lesson detail.
type LessonModule struct {
	ID    uint64     `json:"id"`
	Title string     `json:"title"`
	Path  LessonPath `json:"path"`
}

// LessonDetail is GET /lessons/:slug.
type LessonDetail struct {
	ID               uint64          `json:"id"`
	Slug             string          `json:"slug"`
	Title            string          `json:"title"`
	ContentMD        string          `json:"content_md"`
	EstimatedMinutes int             `json:"estimated_minutes"`
	OrderNo          int             `json:"order_no"`
	Module           LessonModule    `json:"module"`
	PracticeConfig   json.RawMessage `json:"practice_config"`
	Status           string          `json:"status"`
	PracticeDone     bool            `json:"practice_done"`
	QuizScore        int             `json:"quiz_score"`
	QuizTotal        int             `json:"quiz_total"`
	PrevSlug         *string         `json:"prev_slug"`
	NextSlug         *string         `json:"next_slug"`
	Locked           bool            `json:"locked"`
}

// QuizOption is a public answer choice (correctness hidden).
type QuizOption struct {
	ID         uint64 `json:"id"`
	OptionText string `json:"option_text"`
}

// Quiz is a public quiz projection.
type Quiz struct {
	ID       uint64       `json:"id"`
	Question string       `json:"question"`
	Options  []QuizOption `json:"options"`
}

// CheatsheetItem is a command reference row.
type CheatsheetItem struct {
	ID          uint64 `json:"id"`
	Category    string `json:"category"`
	Command     string `json:"command"`
	Description string `json:"description"`
	Example     string `json:"example"`
}

// SearchLesson is a lesson search hit.
type SearchLesson struct {
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	PathTitle   string `json:"path_title"`
	ModuleTitle string `json:"module_title"`
}

// SearchResponse is GET /search.
type SearchResponse struct {
	Lessons    []SearchLesson   `json:"lessons"`
	Cheatsheet []CheatsheetItem `json:"cheatsheet"`
}

// PracticeResponse is POST /lessons/:slug/practice/complete.
type PracticeResponse struct {
	Status       string `json:"status"`
	PracticeDone bool   `json:"practice_done"`
}

// QuizAnswerRequest is POST /quizzes/:id/answer.
type QuizAnswerRequest struct {
	OptionID uint64 `json:"option_id" validate:"required"`
}

// QuizAnswerResponse is the result of answering a quiz.
type QuizAnswerResponse struct {
	IsCorrect        bool   `json:"is_correct"`
	CorrectOptionID  uint64 `json:"correct_option_id"`
	Explanation      string `json:"explanation"`
	SelectedOptionID uint64 `json:"selected_option_id"`
	QuizScore        int    `json:"quiz_score"`
	QuizTotal        int    `json:"quiz_total"`
}

// ReviewAnswerResponse is a quiz answer plus the review id.
type ReviewAnswerResponse struct {
	QuizAnswerResponse
	ReviewID uint64 `json:"review_id"`
}

// CompleteLessonRequest is POST /lessons/:slug/complete.
type CompleteLessonRequest struct {
	QuizScore *int `json:"quiz_score"`
	QuizTotal *int `json:"quiz_total"`
}

// CompleteLessonResponse is the result of completing a lesson.
type CompleteLessonResponse struct {
	Status         string  `json:"status"`
	XPEarned       int     `json:"xp_earned"`
	Badges         []Badge `json:"badges"`
	NextLessonSlug *string `json:"next_lesson_slug"`
}

// ModuleProgress is one row of the overall progress report.
type ModuleProgress struct {
	PathSlug         string `json:"path_slug"`
	PathTitle        string `json:"path_title"`
	ModuleTitle      string `json:"module_title"`
	LessonCount      int    `json:"lesson_count"`
	CompletedLessons int    `json:"completed_lessons"`
	ProgressPercent  int    `json:"progress_percent"`
}

// LessonRef is a compact next-lesson pointer.
type LessonRef struct {
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	PathSlug    string `json:"path_slug"`
	PathTitle   string `json:"path_title"`
	ModuleTitle string `json:"module_title"`
}

// ProgressResponse is GET /progress.
type ProgressResponse struct {
	CompletionPercent int              `json:"completion_percent"`
	LessonsCompleted  int              `json:"lessons_completed"`
	LessonsTotal      int              `json:"lessons_total"`
	Modules           []ModuleProgress `json:"modules"`
	NextLesson        *LessonRef       `json:"next_lesson"`
	Stats             Stats            `json:"stats"`
	Badges            []Badge          `json:"badges"`
}

// ReviewToday is one due review item.
type ReviewToday struct {
	ID           uint64       `json:"id"`
	QuizID       uint64       `json:"quiz_id"`
	Question     string       `json:"question"`
	Options      []QuizOption `json:"options"`
	LessonSlug   string       `json:"lesson_slug"`
	LessonTitle  string       `json:"lesson_title"`
	NextReviewAt time.Time    `json:"next_review_at"`
	IntervalDays int          `json:"interval_days"`
}

// Certificate is GET /certificate.
type Certificate struct {
	Available        bool       `json:"available"`
	Name             string     `json:"name"`
	CompletionPct    int        `json:"completion_percent"`
	CompletedLessons int        `json:"completed_lessons"`
	LessonsTotal     int        `json:"lessons_total"`
	IssuedAt         *time.Time `json:"issued_at"`
	Code             string     `json:"certificate_code"`
}

// Health is GET /health.
type Health struct {
	Status string    `json:"status"`
	Time   time.Time `json:"time"`
	DB     string    `json:"db"`
}
