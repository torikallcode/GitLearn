package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is the complete runtime configuration, loaded from environment
// variables. No secret is ever logged.
type Config struct {
	AppEnv             string
	Port               string
	DBDSN              string
	JWTSecret          string
	JWTAccessTTL       time.Duration
	JWTRefreshTTL      time.Duration
	CORSOrigins        []string
	RateLimitPerMinute int
	FrontendURL        string
	GitHubClientID     string
	GitHubClientSecret string
	GitHubRedirectURL  string
}

const defaultJWTSecret = "gitlearn-development-secret-change-me"

// Load reads configuration from the process environment, loading a local .env
// file first when it exists. Existing environment variables always win.
func Load() (*Config, error) {
	if err := LoadDotEnv(); err != nil {
		return nil, err
	}
	appEnv := env("APP_ENV", "development")

	accessTTL, err := durationEnv("JWT_ACCESS_TTL", 15*time.Minute)
	if err != nil {
		return nil, err
	}
	refreshTTL, err := durationEnv("JWT_REFRESH_TTL", 7*24*time.Hour)
	if err != nil {
		return nil, err
	}
	rateLimit, err := intEnv("RATE_LIMIT_PER_MINUTE", 60)
	if err != nil {
		return nil, err
	}
	if rateLimit < 0 {
		return nil, fmt.Errorf("RATE_LIMIT_PER_MINUTE must be >= 0")
	}

	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		if appEnv == "production" {
			return nil, fmt.Errorf("JWT_SECRET is required in production")
		}
		secret = defaultJWTSecret
	}
	if appEnv == "production" && len(secret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be at least 32 characters in production")
	}

	origins := splitCSV(env("CORS_ORIGINS", "http://localhost:5173"))
	if len(origins) == 0 {
		origins = []string{"http://localhost:5173"}
	}

	return &Config{
		AppEnv:             appEnv,
		Port:               env("PORT", "8080"),
		DBDSN:              env("DB_DSN", "root:torikal@tcp(127.0.0.1:3306)/gitlearn?parseTime=true&multiStatements=true&charset=utf8mb4"),
		JWTSecret:          secret,
		JWTAccessTTL:       accessTTL,
		JWTRefreshTTL:      refreshTTL,
		CORSOrigins:        origins,
		RateLimitPerMinute: rateLimit,
		FrontendURL:        strings.TrimRight(env("FRONTEND_URL", "http://localhost:5173"), "/"),
		GitHubClientID:     env("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: env("GITHUB_CLIENT_SECRET", ""),
		GitHubRedirectURL:  env("GITHUB_REDIRECT_URL", "http://localhost:8080/api/v1/auth/github/callback"),
	}, nil
}

// LoadDotEnv loads key/value pairs from .env in the current directory.
// A missing file is not an error. Process environment variables take
// precedence over values from the file.
func LoadDotEnv() error {
	return loadEnvFile(".env")
}

func loadEnvFile(path string) error {
	content, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}

	for i, raw := range strings.Split(string(content), "\n") {
		line := strings.TrimSpace(strings.TrimPrefix(raw, "\ufeff"))
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			return fmt.Errorf("%s:%d: expected KEY=VALUE", path, i+1)
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" {
			return fmt.Errorf("%s:%d: empty key", path, i+1)
		}
		if len(value) >= 2 {
			first, last := value[0], value[len(value)-1]
			if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
				value = value[1 : len(value)-1]
			}
		}
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		if err := os.Setenv(key, value); err != nil {
			return fmt.Errorf("set %s from %s: %w", key, path, err)
		}
	}
	return nil
}

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func splitCSV(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func durationEnv(key string, fallback time.Duration) (time.Duration, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	d, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	if d <= 0 {
		return 0, fmt.Errorf("%s must be positive", key)
	}
	return d, nil
}

func intEnv(key string, fallback int) (int, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return n, nil
}
