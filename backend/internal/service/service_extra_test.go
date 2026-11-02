package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/pkg/jwt"
)

func isValidation(err error) bool {
	var appErr *domain.AppError
	return errors.As(err, &appErr) && appErr.Code == "VALIDATION_ERROR"
}

func TestContentQuizzesCheatsheetAndSearch(t *testing.T) {
	content := newFakeContent(lessonFixture(1, 1, "git-fundamental", "core", 1, false))
	content.cheat = []domain.CheatsheetItem{{
		ID: 1, Category: "Dasar", Command: "git status",
		Description: "Lihat status working tree", Example: "git status",
	}}
	quizzes := newFakeQuiz()
	quizzes.add(domain.Quiz{ID: 1, LessonID: 1, Question: "Q?", Explanation: "E"},
		domain.QuizOption{ID: 11, QuizID: 1, OptionText: "Benar", IsCorrect: true},
		domain.QuizOption{ID: 12, QuizID: 1, OptionText: "Salah"},
	)
	svc := NewContentService(content, quizzes, newFakeProgress())

	list, err := svc.ListQuizzes(context.Background(), "lesson-1")
	if err != nil {
		t.Fatalf("ListQuizzes: %v", err)
	}
	if len(list) != 1 || len(list[0].Options) != 2 || list[0].Question != "Q?" {
		t.Fatalf("unexpected quizzes: %+v", list)
	}

	items, err := svc.Cheatsheet(context.Background(), "  status  ")
	if err != nil {
		t.Fatalf("Cheatsheet: %v", err)
	}
	if len(items) != 1 || items[0].Command != "git status" {
		t.Fatalf("unexpected cheatsheet: %+v", items)
	}

	empty, err := svc.Search(context.Background(), "   ")
	if err != nil {
		t.Fatalf("Search empty: %v", err)
	}
	if len(empty.Lessons) != 0 || len(empty.Cheatsheet) != 0 {
		t.Fatalf("empty query should return empty result: %+v", empty)
	}

	search, err := svc.Search(context.Background(), "status")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(search.Cheatsheet) != 1 {
		t.Fatalf("unexpected search result: %+v", search)
	}

	search, err = svc.Search(context.Background(), "Lesson")
	if err != nil {
		t.Fatalf("Search lesson: %v", err)
	}
	if len(search.Lessons) != 1 || search.Lessons[0].Slug != "lesson-1" {
		t.Fatalf("lesson search = %+v", search.Lessons)
	}
}

func TestProgressSummaryAndNextLesson(t *testing.T) {
	content := newFakeContent(
		lessonFixture(1, 1, "git-fundamental", "core", 1, false),
		lessonFixture(2, 1, "git-fundamental", "core", 2, false),
	)
	progress := newFakeProgress()
	stats := newFakeStats()
	badges := newFakeBadges(domain.Badge{ID: 1, Code: domain.BadgeFirstStep, Name: "Langkah Pertama"})
	if err := progress.Save(context.Background(), &domain.Progress{
		UserID: 7, LessonID: 1, Status: domain.StatusCompleted,
	}); err != nil {
		t.Fatalf("save progress: %v", err)
	}
	if err := stats.Save(context.Background(), &domain.Stats{
		UserID: 7, XP: 45, CurrentStreak: 3, LongestStreak: 4,
	}); err != nil {
		t.Fatalf("save stats: %v", err)
	}
	if err := badges.Award(context.Background(), 7, 1, time.Now()); err != nil {
		t.Fatalf("award badge: %v", err)
	}

	svc := NewProgressService(content, newFakeQuiz(), progress, newFakeAttempts(), stats, badges)
	summary, err := svc.GetProgress(context.Background(), 7)
	if err != nil {
		t.Fatalf("GetProgress: %v", err)
	}
	if summary.LessonsCompleted != 1 || summary.LessonsTotal != 2 || summary.CompletionPercent != 50 {
		t.Fatalf("unexpected progress counts: %+v", summary)
	}
	if summary.LessonsTotal != 2 || len(summary.Modules) != 1 || summary.Modules[0].CompletedLessons != 1 {
		t.Fatalf("unexpected module progress: %+v", summary.Modules)
	}
	if summary.NextLesson == nil || summary.NextLesson.Slug != "lesson-2" {
		t.Fatalf("next lesson = %+v", summary.NextLesson)
	}
	if summary.Stats.XP != 45 || summary.Stats.CurrentStreak != 3 || len(summary.Badges) != 1 {
		t.Fatalf("unexpected stats overlay: %+v", summary)
	}

	next, err := svc.Next(context.Background(), 7)
	if err != nil || next == nil || next.Slug != "lesson-2" {
		t.Fatalf("Next = %+v, err=%v", next, err)
	}
	if err := progress.Save(context.Background(), &domain.Progress{
		UserID: 7, LessonID: 2, Status: domain.StatusCompleted,
	}); err != nil {
		t.Fatalf("save second progress: %v", err)
	}
	next, err = svc.Next(context.Background(), 7)
	if err != nil || next != nil {
		t.Fatalf("Next after all completed = %+v, err=%v", next, err)
	}
}

func TestBadgesAwardedForStreakAndCompletedPath(t *testing.T) {
	content := newFakeContent(lessonFixture(1, 1, "git-fundamental", "core", 1, false))
	defs := []domain.Badge{
		{ID: 1, Code: domain.BadgeFirstStep, Name: "Langkah Pertama"},
		{ID: 2, Code: domain.BadgeQuizAce, Name: "Nilai Sempurna"},
		{ID: 3, Code: domain.BadgeStreak3, Name: "Streak 3"},
		{ID: 4, Code: domain.BadgeStreak7, Name: "Streak 7"},
		{ID: 5, Code: domain.BadgePathFundamental, Name: "Fundamental"},
		{ID: 6, Code: domain.BadgeAllCore, Name: "Semua Core"},
	}
	badges := newFakeBadges(defs...)
	stats := newFakeStats()
	yesterday := dateOnly(time.Now().UTC()).AddDate(0, 0, -1)
	if err := stats.Save(context.Background(), &domain.Stats{
		UserID: 7, CurrentStreak: 6, LongestStreak: 6, LastActiveDate: &yesterday,
	}); err != nil {
		t.Fatalf("save stats: %v", err)
	}
	svc := NewProgressService(content, newFakeQuiz(), newFakeProgress(), newFakeAttempts(), stats, badges)

	res, err := svc.CompleteLesson(context.Background(), 7, "lesson-1")
	if err != nil {
		t.Fatalf("CompleteLesson: %v", err)
	}
	codes := make(map[string]bool)
	for _, b := range res.Badges {
		codes[b.Code] = true
	}
	for _, code := range []string{
		domain.BadgeFirstStep, domain.BadgeStreak3, domain.BadgeStreak7,
		domain.BadgePathFundamental, domain.BadgeAllCore,
	} {
		if !codes[code] {
			t.Fatalf("badge %s not awarded: %+v", code, res.Badges)
		}
	}
	if codes[domain.BadgeQuizAce] {
		t.Fatalf("quiz-ace should not be awarded without quizzes: %+v", res.Badges)
	}
	if len(badges.byUser[7]) != 5 {
		t.Fatalf("persisted badges = %d, want 5", len(badges.byUser[7]))
	}
	after, _ := stats.Get(context.Background(), 7)
	if after.CurrentStreak != 7 || after.LongestStreak != 7 {
		t.Fatalf("streak after completion = %d/%d", after.CurrentStreak, after.LongestStreak)
	}
}

func TestEngagementStatsWithBadges(t *testing.T) {
	content := newFakeContent(lessonFixture(1, 1, "git-fundamental", "core", 1, false))
	stats := newFakeStats()
	if err := stats.Save(context.Background(), &domain.Stats{
		UserID: 7, XP: 25, CurrentStreak: 2, LongestStreak: 5,
	}); err != nil {
		t.Fatalf("save stats: %v", err)
	}
	badges := newFakeBadges(domain.Badge{ID: 1, Code: domain.BadgeFirstStep, Name: "Langkah Pertama"})
	if err := badges.Award(context.Background(), 7, 1, time.Now()); err != nil {
		t.Fatalf("award badge: %v", err)
	}
	svc := NewEngagementService(content, newFakeProgress(), stats, badges, newFakeUsers())
	res, err := svc.Stats(context.Background(), 7)
	if err != nil {
		t.Fatalf("Stats: %v", err)
	}
	if res.XP != 25 || res.CurrentStreak != 2 || len(res.Badges) != 1 {
		t.Fatalf("unexpected stats response: %+v", res)
	}
}

func TestAuthValidationAndMissingUsers(t *testing.T) {
	users := newFakeUsers()
	stats := newFakeStats()
	tokens := jwt.NewManager("test-secret", time.Minute, time.Hour)
	svc := NewAuthService(users, stats, tokens)
	ctx := context.Background()

	if _, err := svc.Register(ctx, dto.RegisterRequest{Name: " ", Email: "a@example.com", Password: "rahasia123"}); !isValidation(err) {
		t.Fatalf("empty name: %v", err)
	}
	if _, err := svc.Register(ctx, dto.RegisterRequest{Name: "A", Email: "a@example.com", Password: "rahasia123", CareerGoal: "qa"}); !isValidation(err) {
		t.Fatalf("invalid career: %v", err)
	}
	if _, err := svc.Register(ctx, dto.RegisterRequest{Name: "A", Email: "a@example.com", Password: "rahasia123", Level: "expert"}); !isValidation(err) {
		t.Fatalf("invalid level: %v", err)
	}
	if _, err := svc.Login(ctx, dto.LoginRequest{Email: "missing@example.com", Password: "x"}); !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Fatalf("missing login: %v", err)
	}

	user, err := svc.Register(ctx, dto.RegisterRequest{Name: "A", Email: "a@example.com", Password: "rahasia123"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	empty := ""
	invalidCareer := "qa"
	invalidLevel := "expert"
	if _, err := svc.UpdateProfile(ctx, user.User.ID, dto.UpdateProfileRequest{Name: &empty}); !isValidation(err) {
		t.Fatalf("empty update name: %v", err)
	}
	if _, err := svc.UpdateProfile(ctx, user.User.ID, dto.UpdateProfileRequest{CareerGoal: &invalidCareer}); !isValidation(err) {
		t.Fatalf("invalid update career: %v", err)
	}
	if _, err := svc.UpdateProfile(ctx, user.User.ID, dto.UpdateProfileRequest{Level: &invalidLevel}); !isValidation(err) {
		t.Fatalf("invalid update level: %v", err)
	}

	missingToken, _, err := tokens.GeneratePair(999)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	if _, err := svc.Refresh(ctx, missingToken); !errors.Is(err, domain.ErrInvalidToken) {
		t.Fatalf("refresh missing user: %v", err)
	}
	if _, err := svc.Me(ctx, 999); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("me missing user: %v", err)
	}
}
