package integration

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/handler"
	"github.com/gitlearn/backend/internal/pkg/jwt"
	"github.com/gitlearn/backend/internal/repository"
	"github.com/gitlearn/backend/internal/router"
	"github.com/gitlearn/backend/internal/service"
)

type envelope struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
	Error   *struct {
		Code    string `json:"code"`
		Details []struct {
			Field   string `json:"field"`
			Message string `json:"message"`
		} `json:"details"`
	} `json:"error"`
}

func decodeData[T any](t *testing.T, env envelope) T {
	t.Helper()
	var out T
	if err := json.Unmarshal(env.Data, &out); err != nil {
		t.Fatalf("decode data: %v (%s)", err, string(env.Data))
	}
	return out
}

func request(t *testing.T, client *http.Client, base, method, path, token string, body any) (int, envelope) {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request: %v", err)
		}
		reader = bytes.NewReader(raw)
	} else {
		reader = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, base+path, reader)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := client.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()

	var env envelope
	if err := json.NewDecoder(res.Body).Decode(&env); err != nil {
		t.Fatalf("%s %s: decode envelope: %v", method, path, err)
	}
	return res.StatusCode, env
}

func TestCriticalAPIFlows(t *testing.T) {
	dsn := os.Getenv("GITLEARN_TEST_DSN")
	if dsn == "" {
		t.Skip("GITLEARN_TEST_DSN tidak diisi; jalankan migrate + seed lalu set DSN untuk integration test")
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		t.Fatalf("ping database: %v", err)
	}

	var lessonCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM lessons`).Scan(&lessonCount); err != nil {
		t.Fatalf("count lessons: %v", err)
	}
	if lessonCount == 0 {
		t.Skip("database belum di-seed; jalankan go run ./cmd/migrate lalu go run ./cmd/seed")
	}

	tokens := jwt.NewManager("integration-secret", 15*time.Minute, 24*time.Hour)
	users := repository.NewUserRepository(db)
	quizRepo := repository.NewQuizRepository(db)
	engine := router.New(router.Deps{
		Auth:               handler.NewAuthHandler(service.NewAuthService(users, repository.NewStatsRepository(db), tokens)),
		OAuth:              handler.NewOAuthHandler(service.NewAuthService(users, repository.NewStatsRepository(db), tokens), "", "", "", "http://localhost:5173"),
		Content:            handler.NewContentHandler(service.NewContentService(repository.NewContentRepository(db), quizRepo, repository.NewProgressRepository(db))),
		Progress:           handler.NewProgressHandler(service.NewProgressService(repository.NewContentRepository(db), quizRepo, repository.NewProgressRepository(db), repository.NewAttemptRepository(db), repository.NewStatsRepository(db), repository.NewBadgeRepository(db))),
		Quiz:               handler.NewQuizHandler(service.NewQuizService(quizRepo, repository.NewProgressRepository(db), repository.NewAttemptRepository(db), repository.NewReviewRepository(db))),
		Engagement:         handler.NewEngagementHandler(service.NewEngagementService(repository.NewContentRepository(db), repository.NewProgressRepository(db), repository.NewStatsRepository(db), repository.NewBadgeRepository(db), users)),
		Community:          handler.NewCommunityHandler(service.NewCommunityService(repository.NewContentRepository(db), repository.NewCommentRepository(db), users)),
		Leaderboard:        handler.NewLeaderboardHandler(service.NewLeaderboardService(repository.NewLeaderboardRepository(db))),
		Admin:              handler.NewAdminHandler(service.NewAdminService(repository.NewAdminRepository(db), quizRepo)),
		Health:             handler.NewHealthHandler(db),
		Tokens:             tokens,
		Users:              users,
		CORSOrigins:        []string{"http://localhost:5173"},
		RateLimitPerMinute: 0,
	})
	server := httptest.NewServer(engine)
	defer server.Close()
	client := server.Client()
	base := server.URL + "/api/v1"

	var userID uint64
	t.Cleanup(func() {
		if userID != 0 {
			_, _ = db.Exec(`DELETE FROM users WHERE id = ?`, userID)
		}
	})

	status, env := request(t, client, base, http.MethodGet, "/paths", "", nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("public paths: status=%d envelope=%+v", status, env)
	}
	paths := decodeData[[]dto.PathSummary](t, env)
	if len(paths) == 0 {
		t.Fatal("seed returned no paths")
	}
	var corePath *dto.PathSummary
	for i := range paths {
		if paths[i].Slug == "git-fundamental" {
			corePath = &paths[i]
			break
		}
	}
	if corePath == nil || corePath.LessonCount == 0 {
		t.Fatalf("git-fundamental path missing or empty: %+v", paths)
	}

	email := fmt.Sprintf("integration.%d@example.com", time.Now().UnixNano())
	status, env = request(t, client, base, http.MethodPost, "/auth/register", "", dto.RegisterRequest{
		Name: "Integration User", Email: email, Password: "rahasia123", CareerGoal: "frontend",
	})
	if status != http.StatusCreated || !env.Success {
		t.Fatalf("register: status=%d envelope=%+v", status, env)
	}
	auth := decodeData[dto.AuthResponse](t, env)
	userID = auth.User.ID
	if auth.AccessToken == "" || auth.RefreshToken == "" || userID == 0 {
		t.Fatalf("invalid auth response: %+v", auth)
	}
	access := auth.AccessToken

	status, env = request(t, client, base, http.MethodPost, "/auth/login", "", dto.LoginRequest{
		Email: email, Password: "salah-sekali",
	})
	if status != http.StatusUnauthorized || env.Error == nil || env.Error.Code != "INVALID_CREDENTIALS" {
		t.Fatalf("invalid login: status=%d envelope=%+v", status, env)
	}

	status, env = request(t, client, base, http.MethodGet, "/progress", "", nil)
	if status != http.StatusUnauthorized || env.Error == nil || env.Error.Code != "UNAUTHORIZED" {
		t.Fatalf("unauthenticated progress: status=%d envelope=%+v", status, env)
	}

	status, env = request(t, client, base, http.MethodGet, "/paths/git-fundamental", access, nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("path detail: status=%d envelope=%+v", status, env)
	}
	pathDetail := decodeData[dto.PathDetail](t, env)
	if len(pathDetail.Modules) == 0 || len(pathDetail.Modules[0].Lessons) == 0 {
		t.Fatalf("path detail has no lessons: %+v", pathDetail)
	}
	first := pathDetail.Modules[0].Lessons[0]
	if first.Locked {
		t.Fatalf("first lesson should be unlocked: %+v", first)
	}

	status, env = request(t, client, base, http.MethodGet, "/lessons/"+first.Slug, access, nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("lesson detail: status=%d envelope=%+v", status, env)
	}
	lesson := decodeData[dto.LessonDetail](t, env)
	if len(lesson.PracticeConfig) == 0 || lesson.QuizTotal == 0 {
		t.Fatalf("first lesson must have practice and quizzes: %+v", lesson)
	}

	status, env = request(t, client, base, http.MethodGet, "/lessons/"+first.Slug+"/quizzes", access, nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("lesson quizzes: status=%d envelope=%+v", status, env)
	}
	quizzes := decodeData[[]dto.Quiz](t, env)
	if len(quizzes) != lesson.QuizTotal {
		t.Fatalf("quiz count mismatch: api=%d lesson=%d", len(quizzes), lesson.QuizTotal)
	}

	rows, err := db.Query(`
		SELECT o.quiz_id, o.id, o.is_correct
		FROM quiz_options o
		JOIN quizzes q ON q.id = o.quiz_id
		WHERE q.lesson_id = ?
		ORDER BY q.order_no, o.order_no`, lesson.ID)
	if err != nil {
		t.Fatalf("query options: %v", err)
	}
	correctByQuiz := make(map[uint64]uint64)
	wrongByQuiz := make(map[uint64]uint64)
	for rows.Next() {
		var quizID, optionID uint64
		var correct bool
		if err := rows.Scan(&quizID, &optionID, &correct); err != nil {
			rows.Close()
			t.Fatalf("scan option: %v", err)
		}
		if correct {
			if _, exists := correctByQuiz[quizID]; !exists {
				correctByQuiz[quizID] = optionID
			}
		} else if _, exists := wrongByQuiz[quizID]; !exists {
			wrongByQuiz[quizID] = optionID
		}
	}
	if err := rows.Close(); err != nil {
		t.Fatalf("close options: %v", err)
	}

	firstQuiz := quizzes[0]
	if wrong, ok := wrongByQuiz[firstQuiz.ID]; ok {
		status, env = request(t, client, base, http.MethodPost, fmt.Sprintf("/quizzes/%d/answer", firstQuiz.ID), access, dto.QuizAnswerRequest{OptionID: wrong})
		if status != http.StatusOK || !env.Success {
			t.Fatalf("wrong quiz answer: status=%d envelope=%+v", status, env)
		}
		answer := decodeData[dto.QuizAnswerResponse](t, env)
		if answer.IsCorrect || answer.QuizScore != 0 || answer.QuizTotal != len(quizzes) {
			t.Fatalf("unexpected wrong answer: %+v", answer)
		}
	}

	for _, quiz := range quizzes {
		optionID, ok := correctByQuiz[quiz.ID]
		if !ok {
			t.Fatalf("quiz %d has no correct option", quiz.ID)
		}
		status, env = request(t, client, base, http.MethodPost, fmt.Sprintf("/quizzes/%d/answer", quiz.ID), access, dto.QuizAnswerRequest{OptionID: optionID})
		if status != http.StatusOK || !env.Success {
			t.Fatalf("correct quiz answer %d: status=%d envelope=%+v", quiz.ID, status, env)
		}
		answer := decodeData[dto.QuizAnswerResponse](t, env)
		if !answer.IsCorrect {
			t.Fatalf("quiz %d should be correct: %+v", quiz.ID, answer)
		}
	}

	status, env = request(t, client, base, http.MethodPost, "/lessons/"+first.Slug+"/practice/complete", access, nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("complete practice: status=%d envelope=%+v", status, env)
	}
	practice := decodeData[dto.PracticeResponse](t, env)
	if !practice.PracticeDone {
		t.Fatalf("practice not marked done: %+v", practice)
	}

	status, env = request(t, client, base, http.MethodPost, "/lessons/"+first.Slug+"/complete", access, nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("complete lesson: status=%d envelope=%+v", status, env)
	}
	completion := decodeData[dto.CompleteLessonResponse](t, env)
	if completion.Status != "completed" || completion.XPEarned < 20 {
		t.Fatalf("unexpected completion: %+v", completion)
	}
	if len(completion.Badges) == 0 {
		t.Fatalf("expected at least first-step badge: %+v", completion)
	}

	status, env = request(t, client, base, http.MethodGet, "/progress", access, nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("progress: status=%d envelope=%+v", status, env)
	}
	progress := decodeData[dto.ProgressResponse](t, env)
	if progress.LessonsCompleted < 1 || progress.Stats.XP < 45 {
		t.Fatalf("unexpected progress: %+v", progress)
	}
	if progress.NextLesson == nil {
		t.Fatal("expected next lesson after completing the first lesson")
	}

	status, env = request(t, client, base, http.MethodGet, "/auth/me", access, nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("me: status=%d envelope=%+v", status, env)
	}
	me := decodeData[dto.User](t, env)
	if me.Stats.XP < 45 {
		t.Fatalf("stats XP not reflected on user: %+v", me.Stats)
	}

	name := "Integration Updated"
	status, env = request(t, client, base, http.MethodPatch, "/users/me", access, dto.UpdateProfileRequest{Name: &name})
	if status != http.StatusOK || !env.Success {
		t.Fatalf("update profile: status=%d envelope=%+v", status, env)
	}
	updated := decodeData[dto.User](t, env)
	if updated.Name != name {
		t.Fatalf("profile not updated: %+v", updated)
	}

	status, env = request(t, client, base, http.MethodPost, "/auth/refresh", "", dto.RefreshRequest{RefreshToken: auth.RefreshToken})
	if status != http.StatusOK || !env.Success {
		t.Fatalf("refresh: status=%d envelope=%+v", status, env)
	}
	refreshed := decodeData[dto.RefreshResponse](t, env)
	if refreshed.AccessToken == "" || refreshed.RefreshToken == "" {
		t.Fatalf("refresh missing tokens: %+v", refreshed)
	}
	access = refreshed.AccessToken

	if _, err := db.Exec(`UPDATE review_queue SET next_review_at = UTC_TIMESTAMP() WHERE user_id = ?`, userID); err != nil {
		t.Fatalf("make reviews due: %v", err)
	}
	status, env = request(t, client, base, http.MethodGet, "/reviews/today", access, nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("reviews today: status=%d envelope=%+v", status, env)
	}
	reviews := decodeData[[]dto.ReviewToday](t, env)
	if len(reviews) == 0 {
		t.Fatal("expected at least one due review after a wrong answer")
	}
	reviewOption, ok := correctByQuiz[reviews[0].QuizID]
	if !ok {
		t.Fatalf("no correct option for review quiz %d", reviews[0].QuizID)
	}
	status, env = request(t, client, base, http.MethodPost, fmt.Sprintf("/reviews/%d/answer", reviews[0].ID), access, dto.QuizAnswerRequest{OptionID: reviewOption})
	if status != http.StatusOK || !env.Success {
		t.Fatalf("answer review: status=%d envelope=%+v", status, env)
	}
	reviewAnswer := decodeData[dto.ReviewAnswerResponse](t, env)
	if !reviewAnswer.IsCorrect || reviewAnswer.ReviewID != reviews[0].ID {
		t.Fatalf("unexpected review answer: %+v", reviewAnswer)
	}

	status, env = request(t, client, base, http.MethodGet, "/certificate", access, nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("certificate: status=%d envelope=%+v", status, env)
	}
	cert := decodeData[dto.Certificate](t, env)
	if cert.Available {
		t.Fatalf("certificate should not be available after one lesson: %+v", cert)
	}

	status, env = request(t, client, base, http.MethodGet, "/cheatsheet?q=commit", "", nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("cheatsheet: status=%d envelope=%+v", status, env)
	}
	cheatsheet := decodeData[[]dto.CheatsheetItem](t, env)
	if len(cheatsheet) == 0 {
		t.Fatal("cheatsheet search returned no rows")
	}

	status, env = request(t, client, base, http.MethodGet, "/search?q=commit", "", nil)
	if status != http.StatusOK || !env.Success {
		t.Fatalf("search: status=%d envelope=%+v", status, env)
	}
	search := decodeData[dto.SearchResponse](t, env)
	if len(search.Lessons) == 0 && len(search.Cheatsheet) == 0 {
		t.Fatal("search returned no results")
	}
}
