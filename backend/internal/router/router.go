package router

import (
	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/handler"
	"github.com/gitlearn/backend/internal/middleware"
	"github.com/gitlearn/backend/internal/pkg/jwt"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/repository"
)

// Deps contains every dependency the HTTP layer needs. Handlers are already
// wired with their services by cmd/api/main.go.
type Deps struct {
	Auth        *handler.AuthHandler
	OAuth       *handler.OAuthHandler
	Content     *handler.ContentHandler
	Progress    *handler.ProgressHandler
	Quiz        *handler.QuizHandler
	Engagement  *handler.EngagementHandler
	Community   *handler.CommunityHandler
	Leaderboard *handler.LeaderboardHandler
	Admin       *handler.AdminHandler
	Health      *handler.HealthHandler

	Tokens             *jwt.Manager
	Users              repository.UserRepository
	CORSOrigins        []string
	RateLimitPerMinute int
}

// New builds the Gin engine and registers every route.
func New(d Deps) *gin.Engine {
	r := gin.New()
	r.Use(
		middleware.RequestLogger(nil),
		middleware.Recovery(nil),
		middleware.CORS(d.CORSOrigins),
	)

	r.NoRoute(func(c *gin.Context) {
		response.Error(c, 404, "Endpoint tidak ditemukan", "NOT_FOUND", nil)
	})

	// Convenience health endpoint outside the rate-limited API group.
	r.GET("/health", d.Health.Check)

	api := r.Group("/api/v1")
	api.Use(middleware.RateLimit(d.RateLimitPerMinute))

	api.GET("/health", d.Health.Check)

	api.POST("/auth/register", d.Auth.Register)
	api.POST("/auth/login", d.Auth.Login)
	api.POST("/auth/refresh", d.Auth.Refresh)
	api.GET("/auth/github", d.OAuth.Start)
	api.GET("/auth/github/callback", d.OAuth.Callback)
	api.GET("/auth/me", middleware.Auth(d.Tokens), d.Auth.Me)

	public := api.Group("")
	public.Use(middleware.Optional(d.Tokens))
	public.GET("/paths", d.Content.ListPaths)
	public.GET("/paths/:slug", d.Content.GetPath)
	public.GET("/lessons/:slug", d.Content.GetLesson)
	public.GET("/lessons/:slug/quizzes", d.Content.ListQuizzes)
	public.GET("/cheatsheet", d.Content.Cheatsheet)
	public.GET("/search", d.Content.Search)
	public.GET("/certificates/:code", d.Engagement.PublicCertificate)
	public.GET("/leaderboard", d.Leaderboard.Top)
	public.GET("/lessons/:slug/comments", d.Community.List)

	protected := api.Group("")
	protected.Use(middleware.Auth(d.Tokens))
	protected.PATCH("/users/me", d.Auth.UpdateMe)
	protected.POST("/lessons/:slug/practice/complete", d.Progress.CompletePractice)
	protected.POST("/lessons/:slug/complete", d.Progress.CompleteLesson)
	protected.POST("/quizzes/:id/answer", d.Quiz.Answer)
	protected.GET("/progress", d.Progress.Get)
	protected.GET("/progress/next", d.Progress.Next)
	protected.GET("/reviews/today", d.Quiz.ReviewsToday)
	protected.POST("/reviews/:id/answer", d.Quiz.AnswerReview)
	protected.GET("/stats", d.Engagement.Stats)
	protected.GET("/certificate", d.Engagement.Certificate)
	protected.POST("/lessons/:slug/comments", d.Community.Create)
	protected.DELETE("/comments/:id", d.Community.Delete)

	admin := api.Group("/admin")
	admin.Use(middleware.Admin(d.Tokens, d.Users))
	admin.GET("/lessons", d.Admin.ListLessons)
	admin.GET("/lessons/:id", d.Admin.GetLesson)
	admin.PATCH("/lessons/:id", d.Admin.UpdateLesson)
	admin.GET("/lessons/:id/quizzes", d.Admin.ListQuizzes)
	admin.POST("/lessons/:id/quizzes", d.Admin.CreateQuiz)
	admin.PATCH("/quizzes/:id", d.Admin.UpdateQuiz)
	admin.DELETE("/quizzes/:id", d.Admin.DeleteQuiz)

	return r
}
