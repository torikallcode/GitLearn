package domain

import "time"

// User is an authenticated learner.
type User struct {
	ID           uint64    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CareerGoal   string    `json:"career_goal"`
	Level        string    `json:"level"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Stats holds gamification counters for a user.
type Stats struct {
	UserID         uint64     `json:"user_id"`
	XP             int        `json:"xp"`
	CurrentStreak  int        `json:"current_streak"`
	LongestStreak  int        `json:"longest_streak"`
	LastActiveDate *time.Time `json:"last_active_date"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

const (
	CareerFrontend = "frontend"
	CareerBackend  = "backend"

	LevelBeginner     = "beginner"
	LevelIntermediate = "intermediate"
	LevelAdvanced     = "advanced"
)
