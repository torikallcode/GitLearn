package domain

import "time"

// Lesson progress statuses.
const (
	StatusNotStarted = "not_started"
	StatusInProgress = "in_progress"
	StatusCompleted  = "completed"
)

// Progress is a user's state for one lesson.
type Progress struct {
	ID           uint64     `json:"id"`
	UserID       uint64     `json:"user_id"`
	LessonID     uint64     `json:"lesson_id"`
	Status       string     `json:"status"`
	PracticeDone bool       `json:"practice_done"`
	QuizScore    int        `json:"quiz_score"`
	CompletedAt  *time.Time `json:"completed_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// QuizAttempt is one submitted answer.
type QuizAttempt struct {
	ID               uint64    `json:"id"`
	UserID           uint64    `json:"user_id"`
	QuizID           uint64    `json:"quiz_id"`
	SelectedOptionID uint64    `json:"selected_option_id"`
	IsCorrect        bool      `json:"is_correct"`
	AttemptedAt      time.Time `json:"attempted_at"`
}

// ReviewItem is a spaced-repetition entry for a quiz.
type ReviewItem struct {
	ID           uint64    `json:"id"`
	UserID       uint64    `json:"user_id"`
	QuizID       uint64    `json:"quiz_id"`
	NextReviewAt time.Time `json:"next_review_at"`
	IntervalDays int       `json:"interval_days"`
	Ease         float64   `json:"ease"`
	CreatedAt    time.Time `json:"created_at"`

	// Joined fields used by the API.
	Question    string `json:"question,omitempty"`
	LessonID    uint64 `json:"lesson_id,omitempty"`
	LessonSlug  string `json:"lesson_slug,omitempty"`
	LessonTitle string `json:"lesson_title,omitempty"`
}

// Certificate is a computed completion certificate (no table required).
type Certificate struct {
	Available        bool       `json:"available"`
	Name             string     `json:"name"`
	CompletionPct    int        `json:"completion_percent"`
	CompletedLessons int        `json:"completed_lessons"`
	LessonsTotal     int        `json:"lessons_total"`
	IssuedAt         *time.Time `json:"issued_at"`
	Code             string     `json:"certificate_code"`
}
