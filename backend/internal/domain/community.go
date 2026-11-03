package domain

import "time"

// Comment is a learner discussion message attached to a lesson.
type Comment struct {
	ID         uint64    `json:"id"`
	LessonID   uint64    `json:"lesson_id"`
	LessonSlug string    `json:"lesson_slug"`
	UserID     uint64    `json:"user_id"`
	UserName   string    `json:"user_name"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
}

// LeaderboardEntry is a public XP ranking row.
type LeaderboardEntry struct {
	Rank          int    `json:"rank"`
	UserID        uint64 `json:"user_id"`
	Name          string `json:"name"`
	XP            int    `json:"xp"`
	CurrentStreak int    `json:"current_streak"`
	LongestStreak int    `json:"longest_streak"`
}
