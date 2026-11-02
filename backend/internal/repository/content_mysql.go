package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/gitlearn/backend/internal/domain"
)

type contentRepository struct {
	db *sql.DB
}

// NewContentRepository builds a MySQL content repository.
func NewContentRepository(db *sql.DB) ContentRepository {
	return &contentRepository{db: db}
}

const lessonContextColumns = `
	l.id, l.module_id, l.slug, l.title, l.content_md, l.estimated_minutes, l.order_no,
	l.practice_config, l.is_published, l.created_at, l.updated_at,
	m.title, m.order_no,
	p.id, p.slug, p.title, p.order_no, p.track`

func (r *contentRepository) ListPaths(ctx context.Context) ([]domain.Path, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, slug, title, description, order_no, track, created_at, updated_at
		 FROM learning_paths ORDER BY order_no, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	paths := make([]domain.Path, 0)
	for rows.Next() {
		var p domain.Path
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Description, &p.OrderNo, &p.Track, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		paths = append(paths, p)
	}
	return paths, rows.Err()
}

func (r *contentRepository) GetPathBySlug(ctx context.Context, slug string) (*domain.Path, error) {
	return scanPath(r.db.QueryRowContext(ctx,
		`SELECT id, slug, title, description, order_no, track, created_at, updated_at
		 FROM learning_paths WHERE slug = ?`, slug))
}

func (r *contentRepository) GetPathByID(ctx context.Context, id uint64) (*domain.Path, error) {
	return scanPath(r.db.QueryRowContext(ctx,
		`SELECT id, slug, title, description, order_no, track, created_at, updated_at
		 FROM learning_paths WHERE id = ?`, id))
}

func scanPath(row rowScanner) (*domain.Path, error) {
	var p domain.Path
	err := row.Scan(&p.ID, &p.Slug, &p.Title, &p.Description, &p.OrderNo, &p.Track, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *contentRepository) ListModulesByPath(ctx context.Context, pathID uint64) ([]domain.Module, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, path_id, title, description, order_no, created_at, updated_at
		 FROM modules WHERE path_id = ? ORDER BY order_no, id`, pathID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	modules := make([]domain.Module, 0)
	for rows.Next() {
		var m domain.Module
		if err := rows.Scan(&m.ID, &m.PathID, &m.Title, &m.Description, &m.OrderNo, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		modules = append(modules, m)
	}
	return modules, rows.Err()
}

func (r *contentRepository) GetModuleByID(ctx context.Context, id uint64) (*domain.Module, error) {
	var m domain.Module
	err := r.db.QueryRowContext(ctx,
		`SELECT id, path_id, title, description, order_no, created_at, updated_at
		 FROM modules WHERE id = ?`, id,
	).Scan(&m.ID, &m.PathID, &m.Title, &m.Description, &m.OrderNo, &m.CreatedAt, &m.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *contentRepository) GetLessonBySlug(ctx context.Context, slug string) (*domain.Lesson, error) {
	var l domain.Lesson
	err := r.db.QueryRowContext(ctx,
		`SELECT id, module_id, slug, title, content_md, estimated_minutes, order_no,
		        practice_config, is_published, created_at, updated_at
		 FROM lessons WHERE slug = ? AND is_published = 1`, slug,
	).Scan(&l.ID, &l.ModuleID, &l.Slug, &l.Title, &l.ContentMD, &l.EstimatedMinutes, &l.OrderNo,
		&l.PracticeConfig, &l.IsPublished, &l.CreatedAt, &l.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *contentRepository) ListLessonsByModule(ctx context.Context, moduleID uint64) ([]domain.Lesson, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, module_id, slug, title, content_md, estimated_minutes, order_no,
		        practice_config, is_published, created_at, updated_at
		 FROM lessons WHERE module_id = ? AND is_published = 1 ORDER BY order_no, id`, moduleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lessons := make([]domain.Lesson, 0)
	for rows.Next() {
		var l domain.Lesson
		if err := rows.Scan(&l.ID, &l.ModuleID, &l.Slug, &l.Title, &l.ContentMD, &l.EstimatedMinutes, &l.OrderNo,
			&l.PracticeConfig, &l.IsPublished, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		lessons = append(lessons, l)
	}
	return lessons, rows.Err()
}

func (r *contentRepository) GetLessonContextBySlug(ctx context.Context, slug string) (*domain.LessonContext, error) {
	query := fmt.Sprintf(`SELECT %s
		FROM lessons l
		JOIN modules m ON m.id = l.module_id
		JOIN learning_paths p ON p.id = m.path_id
		WHERE l.slug = ? AND l.is_published = 1`, lessonContextColumns)
	return scanLessonContext(r.db.QueryRowContext(ctx, query, slug))
}

func (r *contentRepository) ListLessonContextsByPath(ctx context.Context, pathID uint64) ([]domain.LessonContext, error) {
	query := fmt.Sprintf(`SELECT %s
		FROM lessons l
		JOIN modules m ON m.id = l.module_id
		JOIN learning_paths p ON p.id = m.path_id
		WHERE p.id = ? AND l.is_published = 1
		ORDER BY m.order_no, l.order_no, l.id`, lessonContextColumns)
	return r.queryLessonContexts(ctx, query, pathID)
}

func (r *contentRepository) ListPublishedLessonContexts(ctx context.Context) ([]domain.LessonContext, error) {
	query := fmt.Sprintf(`SELECT %s
		FROM lessons l
		JOIN modules m ON m.id = l.module_id
		JOIN learning_paths p ON p.id = m.path_id
		WHERE l.is_published = 1
		ORDER BY p.order_no, m.order_no, l.order_no, l.id`, lessonContextColumns)
	return r.queryLessonContexts(ctx, query)
}

func (r *contentRepository) queryLessonContexts(ctx context.Context, query string, args ...any) ([]domain.LessonContext, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.LessonContext, 0)
	for rows.Next() {
		lc, err := scanLessonContext(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *lc)
	}
	return out, rows.Err()
}

func scanLessonContext(row rowScanner) (*domain.LessonContext, error) {
	var lc domain.LessonContext
	err := row.Scan(
		&lc.ID, &lc.ModuleID, &lc.Slug, &lc.Title, &lc.ContentMD, &lc.EstimatedMinutes, &lc.OrderNo,
		&lc.PracticeConfig, &lc.IsPublished, &lc.CreatedAt, &lc.UpdatedAt,
		&lc.ModuleTitle, &lc.ModuleOrderNo,
		&lc.PathID, &lc.PathSlug, &lc.PathTitle, &lc.PathOrderNo, &lc.PathTrack,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &lc, nil
}

func (r *contentRepository) SearchLessons(ctx context.Context, query string, limit int) ([]domain.SearchLesson, error) {
	like := "%" + strings.ToLower(query) + "%"
	rows, err := r.db.QueryContext(ctx,
		`SELECT l.slug, l.title, p.title, m.title
		 FROM lessons l
		 JOIN modules m ON m.id = l.module_id
		 JOIN learning_paths p ON p.id = m.path_id
		 WHERE l.is_published = 1
		   AND (LOWER(l.title) LIKE ? OR LOWER(l.content_md) LIKE ?)
		 ORDER BY p.order_no, m.order_no, l.order_no, l.id
		 LIMIT ?`, like, like, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.SearchLesson, 0)
	for rows.Next() {
		var s domain.SearchLesson
		if err := rows.Scan(&s.Slug, &s.Title, &s.PathTitle, &s.ModuleTitle); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *contentRepository) ListCheatsheet(ctx context.Context, query string) ([]domain.CheatsheetItem, error) {
	sqlQuery := `SELECT id, category, command, description, example FROM cheatsheet_items`
	args := make([]any, 0, 2)
	if strings.TrimSpace(query) != "" {
		like := "%" + strings.ToLower(query) + "%"
		sqlQuery += ` WHERE LOWER(command) LIKE ? OR LOWER(description) LIKE ?`
		args = append(args, like, like)
	}
	sqlQuery += ` ORDER BY category, command, id`
	return r.queryCheatsheet(ctx, sqlQuery, args...)
}

func (r *contentRepository) SearchCheatsheet(ctx context.Context, query string, limit int) ([]domain.CheatsheetItem, error) {
	like := "%" + strings.ToLower(query) + "%"
	return r.queryCheatsheet(ctx,
		`SELECT id, category, command, description, example
		 FROM cheatsheet_items
		 WHERE LOWER(command) LIKE ? OR LOWER(description) LIKE ?
		 ORDER BY category, command, id
		 LIMIT ?`, like, like, limit)
}

func (r *contentRepository) queryCheatsheet(ctx context.Context, query string, args ...any) ([]domain.CheatsheetItem, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.CheatsheetItem, 0)
	for rows.Next() {
		var item domain.CheatsheetItem
		if err := rows.Scan(&item.ID, &item.Category, &item.Command, &item.Description, &item.Example); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
