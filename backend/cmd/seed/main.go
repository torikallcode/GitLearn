package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"github.com/gitlearn/backend/internal/config"
	"github.com/gitlearn/backend/internal/pkg/hash"
)

const defaultDSN = "gitlearn:gitlearn@tcp(127.0.0.1:3306)/gitlearn?parseTime=true&multiStatements=true&charset=utf8mb4"

type curriculum struct {
	Paths      []pathSeed       `json:"paths"`
	Cheatsheet []cheatsheetSeed `json:"cheatsheet"`
}

type pathSeed struct {
	Slug        string       `json:"slug"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	OrderNo     int          `json:"order_no"`
	Track       string       `json:"track"`
	Modules     []moduleSeed `json:"modules"`
}

type moduleSeed struct {
	Title       string       `json:"title"`
	Description string       `json:"description"`
	OrderNo     int          `json:"order_no"`
	Lessons     []lessonSeed `json:"lessons"`
}

type lessonSeed struct {
	Slug             string          `json:"slug"`
	Title            string          `json:"title"`
	EstimatedMinutes int             `json:"estimated_minutes"`
	OrderNo          int             `json:"order_no"`
	ContentMD        string          `json:"content_md"`
	PracticeConfig   json.RawMessage `json:"practice_config"`
	Quizzes          []quizSeed      `json:"quizzes"`
}

type quizSeed struct {
	Question    string       `json:"question"`
	Explanation string       `json:"explanation"`
	OrderNo     int          `json:"order_no"`
	Options     []optionSeed `json:"options"`
}

type optionSeed struct {
	Text    string `json:"text"`
	Correct bool   `json:"correct"`
}

type cheatsheetSeed struct {
	Category    string `json:"category"`
	Command     string `json:"command"`
	Description string `json:"description"`
	Example     string `json:"example"`
}

type counts struct {
	paths      int
	modules    int
	lessons    int
	quizzes    int
	options    int
	cheatsheet int
	badges     int
}

func main() {
	if err := config.LoadDotEnv(); err != nil {
		fmt.Fprintf(os.Stderr, "seed error: %v\n", err)
		os.Exit(1)
	}
	dir := flag.String("dir", "seeds", "directory containing curriculum-*.json files")
	flag.Parse()

	if err := run(*dir); err != nil {
		fmt.Fprintf(os.Stderr, "seed error: %v\n", err)
		os.Exit(1)
	}
}

func run(dir string) error {
	files, err := curriculumFiles(dir)
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return fmt.Errorf("no curriculum-*.json files found in %s", dir)
	}

	curricula := make([]curriculum, 0, len(files))
	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read %s: %w", file, err)
		}
		var c curriculum
		if err := json.Unmarshal(content, &c); err != nil {
			return fmt.Errorf("parse %s: %w", file, err)
		}
		curricula = append(curricula, c)
		fmt.Printf("loaded %s (%d paths)\n", filepath.Base(file), len(c.Paths))
	}

	db, err := sql.Open("mysql", envDSN())
	if err != nil {
		return err
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}

	var c counts
	for _, cur := range curricula {
		if err := seedCurriculum(ctx, db, cur, &c); err != nil {
			return err
		}
	}

	c.badges, err = seedBadges(ctx, db)
	if err != nil {
		return fmt.Errorf("seed badges (did you run migrations?): %w", err)
	}

	adminSeeded, err := seedAdmin(ctx, db)
	if err != nil {
		return fmt.Errorf("seed admin: %w", err)
	}

	fmt.Printf("seed complete: paths=%d modules=%d lessons=%d quizzes=%d options=%d cheatsheet=%d badges=%d admin=%d\n",
		c.paths, c.modules, c.lessons, c.quizzes, c.options, c.cheatsheet, c.badges, adminSeeded)
	return nil
}

// seedAdmin creates or promotes the CMS account when ADMIN_EMAIL and
// ADMIN_PASSWORD are provided. Without them no admin account is created.
func seedAdmin(ctx context.Context, db *sql.DB) (int, error) {
	email := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" || password == "" {
		return 0, nil
	}
	hashed, err := hash.Password(password)
	if err != nil {
		return 0, err
	}
	if _, err := db.ExecContext(ctx,
		`INSERT INTO users (name, email, password_hash, career_goal, level, role)
		 VALUES ('Admin GitLearn', ?, ?, '', 'advanced', 'admin')
		 ON DUPLICATE KEY UPDATE role = 'admin', password_hash = VALUES(password_hash)`,
		email, hashed,
	); err != nil {
		return 0, err
	}
	return 1, nil
}

func seedCurriculum(ctx context.Context, db *sql.DB, cur curriculum, c *counts) error {
	for _, p := range cur.Paths {
		pathID, err := upsertPath(ctx, db, p)
		if err != nil {
			return fmt.Errorf("path %q: %w", p.Slug, err)
		}
		c.paths++

		for _, m := range p.Modules {
			moduleID, err := upsertModule(ctx, db, pathID, m)
			if err != nil {
				return fmt.Errorf("module %q: %w", m.Title, err)
			}
			c.modules++

			for _, l := range m.Lessons {
				lessonID, err := upsertLesson(ctx, db, moduleID, l)
				if err != nil {
					return fmt.Errorf("lesson %q: %w", l.Slug, err)
				}
				c.lessons++

				inserted, options, err := seedQuizzes(ctx, db, lessonID, l)
				if err != nil {
					return fmt.Errorf("lesson %q quizzes: %w", l.Slug, err)
				}
				c.quizzes += inserted
				c.options += options
			}
		}
	}

	for _, item := range cur.Cheatsheet {
		if _, err := db.ExecContext(ctx,
			`INSERT INTO cheatsheet_items (category, command, description, example)
			 VALUES (?, ?, ?, ?)
			 ON DUPLICATE KEY UPDATE description = VALUES(description), example = VALUES(example)`,
			item.Category, item.Command, item.Description, item.Example,
		); err != nil {
			return fmt.Errorf("cheatsheet %q: %w", item.Command, err)
		}
		c.cheatsheet++
	}
	return nil
}

func upsertPath(ctx context.Context, db *sql.DB, p pathSeed) (uint64, error) {
	track := p.Track
	if track == "" {
		track = "core"
	}
	if _, err := db.ExecContext(ctx,
		`INSERT INTO learning_paths (slug, title, description, order_no, track)
		 VALUES (?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   title = VALUES(title),
		   description = VALUES(description),
		   order_no = VALUES(order_no),
		   track = VALUES(track)`,
		p.Slug, p.Title, p.Description, p.OrderNo, track,
	); err != nil {
		return 0, err
	}
	var id uint64
	err := db.QueryRowContext(ctx, `SELECT id FROM learning_paths WHERE slug = ?`, p.Slug).Scan(&id)
	return id, err
}

func upsertModule(ctx context.Context, db *sql.DB, pathID uint64, m moduleSeed) (uint64, error) {
	if _, err := db.ExecContext(ctx,
		`INSERT INTO modules (path_id, title, description, order_no)
		 VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
		pathID, m.Title, m.Description, m.OrderNo,
	); err != nil {
		return 0, err
	}
	var id uint64
	err := db.QueryRowContext(ctx,
		`SELECT id FROM modules WHERE path_id = ? AND order_no = ?`, pathID, m.OrderNo).Scan(&id)
	return id, err
}

func upsertLesson(ctx context.Context, db *sql.DB, moduleID uint64, l lessonSeed) (uint64, error) {
	var practice any
	if len(l.PracticeConfig) > 0 && !strings.EqualFold(strings.TrimSpace(string(l.PracticeConfig)), "null") {
		practice = []byte(l.PracticeConfig)
	}
	estimated := l.EstimatedMinutes
	if estimated <= 0 {
		estimated = 5
	}
	if _, err := db.ExecContext(ctx,
		`INSERT INTO lessons (module_id, slug, title, content_md, estimated_minutes, order_no, practice_config, is_published)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 1)
		 ON DUPLICATE KEY UPDATE
		   module_id = VALUES(module_id),
		   title = VALUES(title),
		   content_md = VALUES(content_md),
		   estimated_minutes = VALUES(estimated_minutes),
		   order_no = VALUES(order_no),
		   practice_config = VALUES(practice_config),
		   is_published = 1`,
		moduleID, l.Slug, l.Title, l.ContentMD, estimated, l.OrderNo, practice,
	); err != nil {
		return 0, err
	}
	var id uint64
	err := db.QueryRowContext(ctx, `SELECT id FROM lessons WHERE slug = ?`, l.Slug).Scan(&id)
	return id, err
}

// seedQuizzes inserts quizzes only when the lesson has none, making repeated
// seed runs idempotent without deleting learner attempts.
func seedQuizzes(ctx context.Context, db *sql.DB, lessonID uint64, l lessonSeed) (int, int, error) {
	var existing int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM quizzes WHERE lesson_id = ?`, lessonID).Scan(&existing); err != nil {
		return 0, 0, err
	}
	if existing > 0 {
		return 0, 0, nil
	}

	quizCount, optionCount := 0, 0
	for i, q := range l.Quizzes {
		correct := 0
		for _, o := range q.Options {
			if o.Correct {
				correct++
			}
		}
		if len(q.Options) < 2 || correct != 1 {
			return 0, 0, fmt.Errorf("quiz %d must have at least 2 options and exactly one correct option", i+1)
		}
		order := q.OrderNo
		if order == 0 {
			order = i + 1
		}
		res, err := db.ExecContext(ctx,
			`INSERT INTO quizzes (lesson_id, question, explanation, order_no) VALUES (?, ?, ?, ?)`,
			lessonID, q.Question, q.Explanation, order,
		)
		if err != nil {
			return 0, 0, err
		}
		quizID, err := res.LastInsertId()
		if err != nil {
			return 0, 0, err
		}
		quizCount++
		for j, o := range q.Options {
			if _, err := db.ExecContext(ctx,
				`INSERT INTO quiz_options (quiz_id, option_text, is_correct, order_no) VALUES (?, ?, ?, ?)`,
				quizID, o.Text, o.Correct, j+1,
			); err != nil {
				return 0, 0, err
			}
			optionCount++
		}
	}
	return quizCount, optionCount, nil
}

func seedBadges(ctx context.Context, db *sql.DB) (int, error) {
	definitions := []struct {
		code        string
		name        string
		description string
	}{
		{"first-step", "Langkah Pertama", "Menyelesaikan lesson pertama."},
		{"quiz-ace", "Nilai Sempurna", "Menjawab semua kuis pada satu lesson dengan benar."},
		{"streak-3", "Streak 3 Hari", "Belajar 3 hari berturut-turut."},
		{"streak-7", "Streak 7 Hari", "Belajar 7 hari berturut-turut."},
		{"path-fundamental", "Fundamental Selesai", "Menyelesaikan seluruh Jalur Fundamental."},
		{"all-core", "Master Git", "Menyelesaikan seluruh jalur inti Git."},
	}
	for _, d := range definitions {
		if _, err := db.ExecContext(ctx,
			`INSERT INTO badges (code, name, description) VALUES (?, ?, ?)
			 ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
			d.code, d.name, d.description,
		); err != nil {
			return 0, err
		}
	}
	return len(definitions), nil
}

func curriculumFiles(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read seeds dir: %w", err)
	}
	files := make([]string, 0)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if strings.HasPrefix(name, "curriculum-") && strings.HasSuffix(name, ".json") {
			files = append(files, filepath.Join(dir, name))
		}
	}
	sort.Strings(files)
	return files, nil
}

func envDSN() string {
	if dsn := strings.TrimSpace(os.Getenv("DB_DSN")); dsn != "" {
		return dsn
	}
	return defaultDSN
}
