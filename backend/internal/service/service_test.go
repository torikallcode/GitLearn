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

func lessonFixture(id, pathID uint64, pathSlug, track string, order int, practice bool) domain.LessonContext {
	lc := domain.LessonContext{
		Lesson: domain.Lesson{
			ID:               id,
			ModuleID:         pathID*10 + 1,
			Slug:             "lesson-" + slugNumber(id),
			Title:            "Lesson " + slugNumber(id),
			ContentMD:        "## Materi",
			EstimatedMinutes: 5,
			OrderNo:          order,
			IsPublished:      true,
		},
		ModuleTitle:   "Modul",
		ModuleOrderNo: 1,
		PathID:        pathID,
		PathSlug:      pathSlug,
		PathTitle:     "Jalur",
		PathOrderNo:   int(pathID),
		PathTrack:     track,
	}
	if practice {
		lc.PracticeConfig = []byte(`{"scenario":"empty","checks":[]}`)
	}
	return lc
}

func slugNumber(v uint64) string {
	// Small local helper keeps fixtures readable without importing fmt.
	const digits = "0123456789"
	if v == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = digits[v%10]
		v /= 10
	}
	return string(buf[i:])
}

func testProgress(t *testing.T, content *fakeContent, quizzes *fakeQuiz, progress *fakeProgress, attempts *fakeAttempts, stats *fakeStats, badges *fakeBadges) ProgressService {
	t.Helper()
	return NewProgressService(content, quizzes, progress, attempts, stats, badges)
}

func TestCompletePracticeAwardsXPOnce(t *testing.T) {
	content := newFakeContent(lessonFixture(1, 1, "git-fundamental", "core", 1, true))
	quizzes := newFakeQuiz()
	progress := newFakeProgress()
	attempts := newFakeAttempts()
	stats := newFakeStats()
	svc := testProgress(t, content, quizzes, progress, attempts, stats, newFakeBadges())

	res, err := svc.CompletePractice(context.Background(), 7, "lesson-1")
	if err != nil {
		t.Fatalf("CompletePractice: %v", err)
	}
	if res.Status != domain.StatusInProgress || !res.PracticeDone {
		t.Fatalf("unexpected practice response: %+v", res)
	}
	got, err := stats.Get(context.Background(), 7)
	if err != nil {
		t.Fatalf("stats.Get: %v", err)
	}
	if got.XP != xpPractice {
		t.Fatalf("XP after first practice = %d, want %d", got.XP, xpPractice)
	}

	if _, err := svc.CompletePractice(context.Background(), 7, "lesson-1"); err != nil {
		t.Fatalf("second CompletePractice: %v", err)
	}
	got, _ = stats.Get(context.Background(), 7)
	if got.XP != xpPractice {
		t.Fatalf("practice awarded XP twice: %d", got.XP)
	}
}

func TestCompleteLessonRequiresPracticeAndQuizAnswers(t *testing.T) {
	content := newFakeContent(lessonFixture(1, 1, "git-fundamental", "core", 1, true))
	quizzes := newFakeQuiz()
	quizzes.add(domain.Quiz{ID: 1, LessonID: 1, Question: "Q?", Explanation: "E"}, domain.QuizOption{
		ID: 11, QuizID: 1, OptionText: "Benar", IsCorrect: true,
	})
	progress := newFakeProgress()
	attempts := newFakeAttempts()
	attempts.lessonByQuiz[1] = 1
	stats := newFakeStats()
	svc := testProgress(t, content, quizzes, progress, attempts, stats, newFakeBadges())

	if _, err := svc.CompleteLesson(context.Background(), 7, "lesson-1"); !errors.Is(err, domain.ErrPracticeRequired) {
		t.Fatalf("expected ErrPracticeRequired, got %v", err)
	}
	if _, err := svc.CompletePractice(context.Background(), 7, "lesson-1"); err != nil {
		t.Fatalf("CompletePractice: %v", err)
	}
	if _, err := svc.CompleteLesson(context.Background(), 7, "lesson-1"); !errors.Is(err, domain.ErrQuizRequired) {
		t.Fatalf("expected ErrQuizRequired, got %v", err)
	}

	if err := attempts.Create(context.Background(), &domain.QuizAttempt{
		UserID: 7, QuizID: 1, SelectedOptionID: 11, IsCorrect: true,
	}); err != nil {
		t.Fatalf("Create attempt: %v", err)
	}
	res, err := svc.CompleteLesson(context.Background(), 7, "lesson-1")
	if err != nil {
		t.Fatalf("CompleteLesson: %v", err)
	}
	if res.Status != domain.StatusCompleted || res.XPEarned != xpLessonComplete+xpPerQuizCorrect {
		t.Fatalf("unexpected completion response: %+v", res)
	}
	got, _ := stats.Get(context.Background(), 7)
	if got.XP != xpPractice+xpLessonComplete+xpPerQuizCorrect {
		t.Fatalf("XP = %d, want %d", got.XP, xpPractice+xpLessonComplete+xpPerQuizCorrect)
	}
	if got.CurrentStreak != 1 || got.LongestStreak != 1 {
		t.Fatalf("streak = %d/%d, want 1/1", got.CurrentStreak, got.LongestStreak)
	}

	again, err := svc.CompleteLesson(context.Background(), 7, "lesson-1")
	if err != nil {
		t.Fatalf("second CompleteLesson: %v", err)
	}
	if again.XPEarned != 0 {
		t.Fatalf("completion awarded XP twice: %d", again.XPEarned)
	}
}

func TestCompleteLessonEnforcesSequentialUnlock(t *testing.T) {
	content := newFakeContent(
		lessonFixture(1, 1, "git-fundamental", "core", 1, false),
		lessonFixture(2, 1, "git-fundamental", "core", 2, false),
	)
	svc := testProgress(t, content, newFakeQuiz(), newFakeProgress(), newFakeAttempts(), newFakeStats(), newFakeBadges())

	if _, err := svc.CompleteLesson(context.Background(), 7, "lesson-2"); !errors.Is(err, domain.ErrLessonLocked) {
		t.Fatalf("expected ErrLessonLocked, got %v", err)
	}
	if _, err := svc.CompleteLesson(context.Background(), 7, "lesson-1"); err != nil {
		t.Fatalf("complete first lesson: %v", err)
	}
	if _, err := svc.CompleteLesson(context.Background(), 7, "lesson-2"); err != nil {
		t.Fatalf("complete second lesson after unlock: %v", err)
	}
}

func TestApplyStreak(t *testing.T) {
	now := time.Date(2026, 11, 1, 15, 0, 0, 0, time.UTC)
	yesterday := now.AddDate(0, 0, -1)

	tests := []struct {
		name        string
		last        *time.Time
		current     int
		longest     int
		want        int
		wantLongest int
	}{
		{name: "first activity", want: 1, wantLongest: 1},
		{name: "consecutive day", last: &yesterday, current: 3, longest: 3, want: 4, wantLongest: 4},
		{name: "same day", last: &now, current: 3, longest: 5, want: 3, wantLongest: 5},
		{name: "streak reset", last: timePtr(now.AddDate(0, 0, -2)), current: 9, longest: 9, want: 1, wantLongest: 9},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			stats := &domain.Stats{CurrentStreak: tc.current, LongestStreak: tc.longest, LastActiveDate: tc.last}
			applyStreak(stats, now)
			if stats.CurrentStreak != tc.want || stats.LongestStreak != tc.wantLongest {
				t.Fatalf("got %d/%d, want %d/%d", stats.CurrentStreak, stats.LongestStreak, tc.want, tc.wantLongest)
			}
			if stats.LastActiveDate == nil || !stats.LastActiveDate.Equal(dateOnly(now)) {
				t.Fatalf("last active date = %v", stats.LastActiveDate)
			}
		})
	}
}

func TestQuizAnswerAndReviewScheduling(t *testing.T) {
	now := time.Date(2026, 11, 1, 9, 0, 0, 0, time.UTC)
	quizzes := newFakeQuiz()
	quizzes.add(domain.Quiz{ID: 1, LessonID: 1, Question: "Q?", Explanation: "E"},
		domain.QuizOption{ID: 11, QuizID: 1, OptionText: "Benar", IsCorrect: true},
		domain.QuizOption{ID: 12, QuizID: 1, OptionText: "Salah", IsCorrect: false},
	)
	progress := newFakeProgress()
	attempts := newFakeAttempts()
	attempts.lessonByQuiz[1] = 1
	reviews := newFakeReviews()
	svc := NewQuizService(quizzes, progress, attempts, reviews).(*quizService)
	svc.now = func() time.Time { return now }

	res, err := svc.Answer(context.Background(), 7, 1, 12)
	if err != nil {
		t.Fatalf("wrong answer: %v", err)
	}
	if res.IsCorrect || res.CorrectOptionID != 11 || res.QuizScore != 0 || res.QuizTotal != 1 {
		t.Fatalf("unexpected wrong-answer response: %+v", res)
	}
	if len(reviews.items) != 1 {
		t.Fatalf("wrong answer did not enqueue review: %d", len(reviews.items))
	}
	p, err := progress.Get(context.Background(), 7, 1)
	if err != nil || p.Status != domain.StatusInProgress {
		t.Fatalf("progress after wrong answer = %+v, err=%v", p, err)
	}

	res, err = svc.Answer(context.Background(), 7, 1, 11)
	if err != nil {
		t.Fatalf("correct answer: %v", err)
	}
	if !res.IsCorrect || res.QuizScore != 1 || res.QuizTotal != 1 {
		t.Fatalf("unexpected correct-answer response: %+v", res)
	}
	if _, err := svc.Answer(context.Background(), 7, 1, 99); !errors.Is(err, domain.ErrInvalidOption) {
		t.Fatalf("expected ErrInvalidOption, got %v", err)
	}

	due, err := svc.ReviewsToday(context.Background(), 7)
	if err != nil {
		t.Fatalf("ReviewsToday: %v", err)
	}
	if len(due) != 0 {
		t.Fatalf("review scheduled tomorrow should not be due today: %d", len(due))
	}

	var item *domain.ReviewItem
	for _, v := range reviews.items {
		item = v
	}
	item.NextReviewAt = now
	item.IntervalDays = 2
	item.Ease = 2.5
	due, err = svc.ReviewsToday(context.Background(), 7)
	if err != nil || len(due) != 1 {
		t.Fatalf("ReviewsToday due = %d, err=%v", len(due), err)
	}
	if len(due[0].Options) != 2 {
		t.Fatalf("review options = %d, want 2", len(due[0].Options))
	}

	answer, err := svc.AnswerReview(context.Background(), 7, item.ID, 11)
	if err != nil {
		t.Fatalf("AnswerReview: %v", err)
	}
	if !answer.IsCorrect || answer.ReviewID != item.ID {
		t.Fatalf("unexpected review answer: %+v", answer)
	}
	if item.IntervalDays != 5 || !item.NextReviewAt.Equal(now.AddDate(0, 0, 5)) {
		t.Fatalf("review schedule = interval %d at %v", item.IntervalDays, item.NextReviewAt)
	}

	if _, err := svc.AnswerReview(context.Background(), 8, item.ID, 11); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("review from another user should be hidden, got %v", err)
	}
}

func TestAuthRegisterLoginRefreshAndProfile(t *testing.T) {
	users := newFakeUsers()
	stats := newFakeStats()
	tokens := jwt.NewManager("test-secret", time.Minute, time.Hour)
	svc := NewAuthService(users, stats, tokens)

	res, err := svc.Register(context.Background(), dto.RegisterRequest{
		Name: "  Rina  ", Email: " RINA@Example.COM ", Password: "rahasia123",
		CareerGoal: domain.CareerFrontend,
	})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if res.User.Name != "Rina" || res.User.Email != "rina@example.com" || res.User.CareerGoal != domain.CareerFrontend {
		t.Fatalf("unexpected user: %+v", res.User)
	}
	if res.AccessToken == "" || res.RefreshToken == "" {
		t.Fatal("register did not return tokens")
	}
	if res.User.Stats.XP != 0 || res.User.Stats.CurrentStreak != 0 {
		t.Fatalf("unexpected initial stats: %+v", res.User.Stats)
	}

	if _, err := svc.Register(context.Background(), dto.RegisterRequest{
		Name: "Rina Lain", Email: "rina@example.com", Password: "rahasia123",
	}); !errors.Is(err, domain.ErrEmailTaken) {
		t.Fatalf("expected ErrEmailTaken, got %v", err)
	}

	if _, err := svc.Login(context.Background(), dto.LoginRequest{Email: "RINA@example.com", Password: "salah"}); !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials, got %v", err)
	}
	if _, err := svc.Login(context.Background(), dto.LoginRequest{Email: "RINA@example.com", Password: "rahasia123"}); err != nil {
		t.Fatalf("Login: %v", err)
	}

	refreshed, err := svc.Refresh(context.Background(), res.RefreshToken)
	if err != nil {
		t.Fatalf("Refresh: %v", err)
	}
	if refreshed.AccessToken == "" || refreshed.RefreshToken == "" {
		t.Fatal("refresh did not return tokens")
	}
	if _, err := svc.Refresh(context.Background(), "not-a-token"); !errors.Is(err, domain.ErrInvalidToken) {
		t.Fatalf("expected ErrInvalidToken, got %v", err)
	}

	me, err := svc.Me(context.Background(), res.User.ID)
	if err != nil || me.Email != "rina@example.com" {
		t.Fatalf("Me = %+v, err=%v", me, err)
	}
	name := "Rina Updated"
	level := domain.LevelAdvanced
	updated, err := svc.UpdateProfile(context.Background(), res.User.ID, dto.UpdateProfileRequest{Name: &name, Level: &level})
	if err != nil || updated.Name != name || updated.Level != level {
		t.Fatalf("UpdateProfile = %+v, err=%v", updated, err)
	}
}

func TestContentPathLocksAndProgressOverlay(t *testing.T) {
	content := newFakeContent(
		lessonFixture(1, 1, "git-fundamental", "core", 1, false),
		lessonFixture(2, 1, "git-fundamental", "core", 2, false),
	)
	progress := newFakeProgress()
	svc := NewContentService(content, newFakeQuiz(), progress)

	paths, err := svc.ListPaths(context.Background(), nil)
	if err != nil || len(paths) != 1 {
		t.Fatalf("ListPaths = %+v, err=%v", paths, err)
	}
	if paths[0].LessonCount != 2 || paths[0].ProgressPercent != 0 {
		t.Fatalf("unexpected path summary: %+v", paths[0])
	}

	detail, err := svc.GetPath(context.Background(), "git-fundamental", nil)
	if err != nil {
		t.Fatalf("GetPath: %v", err)
	}
	if detail.Modules[0].Lessons[0].Locked || !detail.Modules[0].Lessons[1].Locked {
		t.Fatalf("anonymous lock state wrong: %+v", detail.Modules[0].Lessons)
	}

	lesson, err := svc.GetLesson(context.Background(), "lesson-2", nil)
	if err != nil {
		t.Fatalf("GetLesson: %v", err)
	}
	if !lesson.Locked || lesson.QuizTotal != 0 {
		t.Fatalf("unexpected locked lesson detail: %+v", lesson)
	}

	uid := uint64(7)
	if err := progress.Save(context.Background(), &domain.Progress{
		UserID: uid, LessonID: 1, Status: domain.StatusCompleted, PracticeDone: true,
	}); err != nil {
		t.Fatalf("save progress: %v", err)
	}
	detail, err = svc.GetPath(context.Background(), "git-fundamental", &uid)
	if err != nil {
		t.Fatalf("GetPath authenticated: %v", err)
	}
	if detail.Path.CompletedLessons != 1 || detail.Path.ProgressPercent != 50 {
		t.Fatalf("unexpected path progress: %+v", detail.Path)
	}
	if detail.Modules[0].Lessons[1].Locked {
		t.Fatal("second lesson should unlock after first is completed")
	}

	lesson, err = svc.GetLesson(context.Background(), "lesson-2", &uid)
	if err != nil || lesson.Locked {
		t.Fatalf("GetLesson unlocked = %+v, err=%v", lesson, err)
	}
	if lesson.PrevSlug == nil || *lesson.PrevSlug != "lesson-1" {
		t.Fatalf("prev slug = %v", lesson.PrevSlug)
	}
}

func TestCertificateIgnoresCareerTracks(t *testing.T) {
	content := newFakeContent(
		lessonFixture(1, 1, "git-fundamental", "core", 1, false),
		lessonFixture(2, 2, "karier-frontend", "frontend", 1, false),
	)
	users := newFakeUsers()
	user := &domain.User{Name: "Rina", Email: "rina@example.com"}
	if err := users.Create(context.Background(), user); err != nil {
		t.Fatalf("create user: %v", err)
	}
	progress := newFakeProgress()
	if err := progress.Save(context.Background(), &domain.Progress{
		UserID: user.ID, LessonID: 1, Status: domain.StatusCompleted,
	}); err != nil {
		t.Fatalf("save progress: %v", err)
	}
	stats := newFakeStats()
	svc := NewEngagementService(content, progress, stats, newFakeBadges(), users).(*engagementService)
	svc.now = func() time.Time { return time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC) }

	cert, err := svc.Certificate(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Certificate: %v", err)
	}
	if !cert.Available || cert.LessonsTotal != 1 || cert.CompletedLessons != 1 || cert.CompletionPct != 100 {
		t.Fatalf("unexpected certificate: %+v", cert)
	}
	if cert.Code == "" || cert.IssuedAt == nil {
		t.Fatalf("certificate missing issue data: %+v", cert)
	}

	statsRes, err := svc.Stats(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Stats: %v", err)
	}
	if statsRes.XP != 0 || len(statsRes.Badges) != 0 {
		t.Fatalf("unexpected empty stats: %+v", statsRes)
	}
}

func timePtr(t time.Time) *time.Time { return &t }
