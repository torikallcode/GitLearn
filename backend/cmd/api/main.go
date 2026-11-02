package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"

	"github.com/gitlearn/backend/internal/config"
	"github.com/gitlearn/backend/internal/handler"
	"github.com/gitlearn/backend/internal/pkg/jwt"
	"github.com/gitlearn/backend/internal/repository"
	"github.com/gitlearn/backend/internal/router"
	"github.com/gitlearn/backend/internal/service"
)

func main() {
	if err := run(); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	logLevel := slog.LevelInfo
	if cfg.AppEnv == "development" {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db, err := sql.Open("mysql", cfg.DBDSN)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(2 * time.Minute)

	pingCtx, cancelPing := context.WithTimeout(context.Background(), 5*time.Second)
	err = db.PingContext(pingCtx)
	cancelPing()
	if err != nil {
		return fmt.Errorf("ping database: %w", err)
	}

	tokens := jwt.NewManager(cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)

	users := repository.NewUserRepository(db)
	stats := repository.NewStatsRepository(db)
	badges := repository.NewBadgeRepository(db)
	content := repository.NewContentRepository(db)
	quizzes := repository.NewQuizRepository(db)
	progress := repository.NewProgressRepository(db)
	attempts := repository.NewAttemptRepository(db)
	reviews := repository.NewReviewRepository(db)

	authService := service.NewAuthService(users, stats, tokens)
	contentService := service.NewContentService(content, quizzes, progress)
	progressService := service.NewProgressService(content, quizzes, progress, attempts, stats, badges)
	quizService := service.NewQuizService(quizzes, progress, attempts, reviews)
	engagementService := service.NewEngagementService(content, progress, stats, badges, users)

	engine := router.New(router.Deps{
		Auth:               handler.NewAuthHandler(authService),
		Content:            handler.NewContentHandler(contentService),
		Progress:           handler.NewProgressHandler(progressService),
		Quiz:               handler.NewQuizHandler(quizService),
		Engagement:         handler.NewEngagementHandler(engagementService),
		Health:             handler.NewHealthHandler(db),
		Tokens:             tokens,
		CORSOrigins:        cfg.CORSOrigins,
		RateLimitPerMinute: cfg.RateLimitPerMinute,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           engine,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		logger.Info("api listening", "env", cfg.AppEnv, "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("serve: %w", err)
		}
		return nil
	case <-ctx.Done():
		logger.Info("shutdown signal received")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	logger.Info("server stopped gracefully")
	return nil
}
