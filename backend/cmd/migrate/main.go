package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"github.com/gitlearn/backend/internal/config"
)

const defaultDSN = "gitlearn:gitlearn@tcp(127.0.0.1:3306)/gitlearn?parseTime=true&multiStatements=true&charset=utf8mb4"

type migration struct {
	version int
	up      string
	down    string
}

func main() {
	if err := config.LoadDotEnv(); err != nil {
		fmt.Fprintf(os.Stderr, "migrate error: %v\n", err)
		os.Exit(1)
	}
	dir := flag.String("dir", "migrations", "directory containing *.up.sql / *.down.sql files")
	flag.Parse()

	command := "up"
	if args := flag.Args(); len(args) > 0 {
		command = args[0]
	}

	if err := run(*dir, command); err != nil {
		fmt.Fprintf(os.Stderr, "migrate error: %v\n", err)
		os.Exit(1)
	}
}

func run(dir, command string) error {
	migrations, err := loadMigrations(dir)
	if err != nil {
		return err
	}
	if len(migrations) == 0 {
		return fmt.Errorf("no migrations found in %s", dir)
	}

	db, err := sql.Open("mysql", ensureMultiStatements(envDSN()))
	if err != nil {
		return err
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version INT NOT NULL,
		applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (version)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	applied, err := appliedVersions(ctx, db)
	if err != nil {
		return err
	}

	switch command {
	case "up":
		return up(ctx, db, migrations, applied)
	case "down":
		return down(ctx, db, migrations, applied)
	case "status":
		for _, m := range migrations {
			state := "pending"
			if applied[m.version] {
				state = "applied"
			}
			fmt.Printf("%06d %s\n", m.version, state)
		}
		return nil
	default:
		return fmt.Errorf("unknown command %q (use up, down or status)", command)
	}
}

func up(ctx context.Context, db *sql.DB, migrations []migration, applied map[int]bool) error {
	count := 0
	for _, m := range migrations {
		if applied[m.version] {
			continue
		}
		content, err := os.ReadFile(m.up)
		if err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, string(content)); err != nil {
			return fmt.Errorf("apply %s: %w", filepath.Base(m.up), err)
		}
		if _, err := db.ExecContext(ctx, `INSERT INTO schema_migrations (version) VALUES (?)`, m.version); err != nil {
			return fmt.Errorf("record version %d: %w", m.version, err)
		}
		fmt.Printf("applied %s\n", filepath.Base(m.up))
		count++
	}
	if count == 0 {
		fmt.Println("database is up to date")
	}
	return nil
}

func down(ctx context.Context, db *sql.DB, migrations []migration, applied map[int]bool) error {
	var last *migration
	for i := range migrations {
		if applied[migrations[i].version] {
			last = &migrations[i]
		}
	}
	if last == nil {
		fmt.Println("no applied migration to roll back")
		return nil
	}
	if last.down == "" {
		return fmt.Errorf("no down file for version %d", last.version)
	}
	content, err := os.ReadFile(last.down)
	if err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx, string(content)); err != nil {
		return fmt.Errorf("rollback %s: %w", filepath.Base(last.down), err)
	}
	if _, err := db.ExecContext(ctx, `DELETE FROM schema_migrations WHERE version = ?`, last.version); err != nil {
		return fmt.Errorf("remove version %d: %w", last.version, err)
	}
	fmt.Printf("rolled back %s\n", filepath.Base(last.down))
	return nil
}

func appliedVersions(ctx context.Context, db *sql.DB) (map[int]bool, error) {
	rows, err := db.QueryContext(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[int]bool)
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		out[version] = true
	}
	return out, rows.Err()
}

func loadMigrations(dir string) ([]migration, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}

	byVersion := make(map[int]*migration)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		var version int
		switch {
		case strings.HasSuffix(name, ".up.sql"):
			version, err = versionFromName(name)
			if err != nil {
				return nil, err
			}
			m := byVersion[version]
			if m == nil {
				m = &migration{version: version}
				byVersion[version] = m
			}
			m.up = filepath.Join(dir, name)
		case strings.HasSuffix(name, ".down.sql"):
			version, err = versionFromName(name)
			if err != nil {
				return nil, err
			}
			m := byVersion[version]
			if m == nil {
				m = &migration{version: version}
				byVersion[version] = m
			}
			m.down = filepath.Join(dir, name)
		}
	}

	out := make([]migration, 0, len(byVersion))
	for _, m := range byVersion {
		if m.up == "" {
			return nil, fmt.Errorf("migration %06d has no up file", m.version)
		}
		out = append(out, *m)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].version < out[j].version })
	return out, nil
}

func versionFromName(name string) (int, error) {
	prefix := strings.SplitN(name, "_", 2)[0]
	version, err := strconv.Atoi(prefix)
	if err != nil {
		return 0, fmt.Errorf("invalid migration filename %q: version prefix must be numeric", name)
	}
	return version, nil
}

func envDSN() string {
	if dsn := strings.TrimSpace(os.Getenv("DB_DSN")); dsn != "" {
		return dsn
	}
	return defaultDSN
}

func ensureMultiStatements(dsn string) string {
	if strings.Contains(dsn, "multiStatements=") {
		return dsn
	}
	if strings.Contains(dsn, "?") {
		return dsn + "&multiStatements=true"
	}
	return dsn + "?multiStatements=true"
}
