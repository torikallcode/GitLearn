package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadEnvFile(t *testing.T) {
	t.Setenv("GITLEARN_ENV_EXISTING", "from-process")
	t.Cleanup(func() {
		_ = os.Unsetenv("GITLEARN_ENV_PLAIN")
		_ = os.Unsetenv("GITLEARN_ENV_QUOTED")
	})

	path := filepath.Join(t.TempDir(), ".env")
	content := strings.Join([]string{
		"# komentar",
		"",
		"export GITLEARN_ENV_PLAIN=hello",
		`GITLEARN_ENV_QUOTED="dunia"`,
		"GITLEARN_ENV_EXISTING=from-file",
	}, "\n")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	if err := loadEnvFile(path); err != nil {
		t.Fatalf("loadEnvFile: %v", err)
	}
	if got := os.Getenv("GITLEARN_ENV_PLAIN"); got != "hello" {
		t.Fatalf("plain value = %q", got)
	}
	if got := os.Getenv("GITLEARN_ENV_QUOTED"); got != "dunia" {
		t.Fatalf("quoted value = %q", got)
	}
	if got := os.Getenv("GITLEARN_ENV_EXISTING"); got != "from-process" {
		t.Fatalf("existing value was overridden: %q", got)
	}
}

func TestLoadEnvFileMissingAndInvalid(t *testing.T) {
	if err := loadEnvFile(filepath.Join(t.TempDir(), "missing.env")); err != nil {
		t.Fatalf("missing file should be ignored: %v", err)
	}

	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte("BUKAN_PASANGAN"), 0o600); err != nil {
		t.Fatalf("write invalid env: %v", err)
	}
	if err := loadEnvFile(path); err == nil {
		t.Fatal("expected invalid env line to return an error")
	}
}
