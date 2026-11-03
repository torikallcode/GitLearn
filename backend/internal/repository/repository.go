package repository

import (
	"context"
	"time"

	"github.com/gitlearn/backend/internal/domain"
)

// UserRepository persists learners.
type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByID(ctx context.Context, id uint64) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Update(ctx context.Context, user *domain.User) error
}

// StatsRepository persists gamification counters.
type StatsRepository interface {
	Get(ctx context.Context, userID uint64) (*domain.Stats, error)
	Save(ctx context.Context, stats *domain.Stats) error
}

// BadgeRepository persists badge definitions and awards.
type BadgeRepository interface {
	ListDefinitions(ctx context.Context) ([]domain.Badge, error)
	ListByUser(ctx context.Context, userID uint64) ([]domain.Badge, error)
	Award(ctx context.Context, userID, badgeID uint64, earnedAt time.Time) error
}

// ContentRepository reads the curriculum catalog.
type ContentRepository interface {
	ListPaths(ctx context.Context) ([]domain.Path, error)
	GetPathBySlug(ctx context.Context, slug string) (*domain.Path, error)
	GetPathByID(ctx context.Context, id uint64) (*domain.Path, error)
	ListModulesByPath(ctx context.Context, pathID uint64) ([]domain.Module, error)
	GetModuleByID(ctx context.Context, id uint64) (*domain.Module, error)
	GetLessonBySlug(ctx context.Context, slug string) (*domain.Lesson, error)
	GetLessonContextBySlug(ctx context.Context, slug string) (*domain.LessonContext, error)
	ListLessonContextsByPath(ctx context.Context, pathID uint64) ([]domain.LessonContext, error)
	ListPublishedLessonContexts(ctx context.Context) ([]domain.LessonContext, error)
	SearchLessons(ctx context.Context, query string, limit int) ([]domain.SearchLesson, error)
	ListCheatsheet(ctx context.Context, query string) ([]domain.CheatsheetItem, error)
	SearchCheatsheet(ctx context.Context, query string, limit int) ([]domain.CheatsheetItem, error)
}

// QuizRepository reads quizzes and their options.
type QuizRepository interface {
	ListByLesson(ctx context.Context, lessonID uint64) ([]domain.Quiz, error)
	GetByID(ctx context.Context, id uint64) (*domain.Quiz, error)
	GetWithLesson(ctx context.Context, id uint64) (*domain.Quiz, error)
	GetOptionsByQuizID(ctx context.Context, quizID uint64) ([]domain.QuizOption, error)
	GetOption(ctx context.Context, quizID, optionID uint64) (*domain.QuizOption, error)
	CountByLesson(ctx context.Context, lessonID uint64) (int, error)
	CountByLessonIDs(ctx context.Context, lessonIDs []uint64) (map[uint64]int, error)
}

// ProgressRepository persists per-user lesson state.
type ProgressRepository interface {
	Get(ctx context.Context, userID, lessonID uint64) (*domain.Progress, error)
	ListByUser(ctx context.Context, userID uint64) ([]domain.Progress, error)
	Save(ctx context.Context, progress *domain.Progress) error
}

// AttemptRepository persists quiz answers.
type AttemptRepository interface {
	Create(ctx context.Context, attempt *domain.QuizAttempt) error
	CountDistinctCorrectByLesson(ctx context.Context, userID, lessonID uint64) (int, error)
	CountDistinctAnsweredByLesson(ctx context.Context, userID, lessonID uint64) (int, error)
}

// ReviewRepository persists spaced-repetition schedule entries.
type ReviewRepository interface {
	ListDue(ctx context.Context, userID uint64, now time.Time) ([]domain.ReviewItem, error)
	GetForUser(ctx context.Context, reviewID, userID uint64) (*domain.ReviewItem, error)
	Upsert(ctx context.Context, item *domain.ReviewItem) error
	UpdateSchedule(ctx context.Context, reviewID, userID uint64, intervalDays int, ease float64, next time.Time) error
}

// CommentRepository persists lesson discussions.
type CommentRepository interface {
	ListByLesson(ctx context.Context, lessonID uint64) ([]domain.Comment, error)
	Get(ctx context.Context, id uint64) (*domain.Comment, error)
	Create(ctx context.Context, comment *domain.Comment) error
	Delete(ctx context.Context, id uint64) error
}

// LeaderboardRepository reads the public XP ranking.
type LeaderboardRepository interface {
	TopXP(ctx context.Context, limit int) ([]domain.LeaderboardEntry, error)
}

// AdminRepository reads and writes curriculum content for the CMS.
type AdminRepository interface {
	ListLessons(ctx context.Context) ([]domain.LessonContext, error)
	GetLesson(ctx context.Context, id uint64) (*domain.LessonContext, error)
	UpdateLesson(ctx context.Context, lesson *domain.Lesson) error
	GetQuiz(ctx context.Context, id uint64) (*domain.Quiz, error)
	CreateQuiz(ctx context.Context, quiz *domain.Quiz) error
	UpdateQuiz(ctx context.Context, quiz *domain.Quiz) error
	DeleteQuiz(ctx context.Context, id uint64) error
}
