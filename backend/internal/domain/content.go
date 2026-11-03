package domain

import (
	"bytes"
	"time"
)

// Path is a learning track (core, collab, pro, frontend, backend).
type Path struct {
	ID          uint64    `json:"id"`
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	OrderNo     int       `json:"order_no"`
	Track       string    `json:"track"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Module groups lessons inside a path.
type Module struct {
	ID          uint64    `json:"id"`
	PathID      uint64    `json:"path_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	OrderNo     int       `json:"order_no"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Lesson is a single learning unit.
type Lesson struct {
	ID               uint64    `json:"id"`
	ModuleID         uint64    `json:"module_id"`
	Slug             string    `json:"slug"`
	Title            string    `json:"title"`
	ContentMD        string    `json:"content_md"`
	EstimatedMinutes int       `json:"estimated_minutes"`
	OrderNo          int       `json:"order_no"`
	PracticeConfig   []byte    `json:"practice_config"`
	IsPublished      bool      `json:"is_published"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// HasPractice reports whether the lesson defines a simulator practice config.
func (l Lesson) HasPractice() bool {
	trimmed := bytes.TrimSpace(l.PracticeConfig)
	return len(trimmed) > 0 && !bytes.Equal(trimmed, []byte("null"))
}

// LessonContext flattens a lesson with its module and path ordering metadata.
type LessonContext struct {
	Lesson
	ModuleTitle   string
	ModuleOrderNo int
	PathID        uint64
	PathSlug      string
	PathTitle     string
	PathOrderNo   int
	PathTrack     string
	QuizCount     int
}

// Quiz is a multiple-choice question.
type Quiz struct {
	ID          uint64       `json:"id"`
	LessonID    uint64       `json:"lesson_id"`
	Question    string       `json:"question"`
	Explanation string       `json:"explanation"`
	OrderNo     int          `json:"order_no"`
	Options     []QuizOption `json:"options,omitempty"`
	LessonSlug  string       `json:"lesson_slug,omitempty"`
	LessonTitle string       `json:"lesson_title,omitempty"`
}

// QuizOption is one answer choice. IsCorrect is never serialised to clients.
type QuizOption struct {
	ID         uint64 `json:"id"`
	QuizID     uint64 `json:"quiz_id"`
	OptionText string `json:"option_text"`
	IsCorrect  bool   `json:"-"`
	OrderNo    int    `json:"order_no"`
}

// CheatsheetItem is a searchable Git command reference.
type CheatsheetItem struct {
	ID          uint64 `json:"id"`
	Category    string `json:"category"`
	Command     string `json:"command"`
	Description string `json:"description"`
	Example     string `json:"example"`
}

// SearchLesson is the lean lesson projection returned by search.
type SearchLesson struct {
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	PathTitle   string `json:"path_title"`
	ModuleTitle string `json:"module_title"`
}
