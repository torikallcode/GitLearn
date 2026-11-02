package domain

import "time"

// Badge is an achievement definition, optionally with a user's earned date.
type Badge struct {
	ID          uint64     `json:"id"`
	Code        string     `json:"code"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	EarnedAt    *time.Time `json:"earned_at,omitempty"`
}

// Built-in badge codes.
const (
	BadgeFirstStep      = "first-step"
	BadgeQuizAce        = "quiz-ace"
	BadgeStreak3        = "streak-3"
	BadgeStreak7        = "streak-7"
	BadgePathFundamental = "path-fundamental"
	BadgeAllCore        = "all-core"
)
