package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/gitlearn/backend/internal/domain"
)

type commentRepository struct {
	db *sql.DB
}

// NewCommentRepository builds a MySQL comment repository.
func NewCommentRepository(db *sql.DB) CommentRepository {
	return &commentRepository{db: db}
}

const commentColumns = `c.id, c.lesson_id, l.slug, c.user_id, u.name, c.content, c.created_at`

func (r *commentRepository) ListByLesson(ctx context.Context, lessonID uint64) ([]domain.Comment, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+commentColumns+`
		 FROM lesson_comments c
		 JOIN users u ON u.id = c.user_id
		 JOIN lessons l ON l.id = c.lesson_id
		 WHERE c.lesson_id = ?
		 ORDER BY c.created_at DESC, c.id DESC`, lessonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.Comment, 0)
	for rows.Next() {
		c, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

func (r *commentRepository) Get(ctx context.Context, id uint64) (*domain.Comment, error) {
	return scanComment(r.db.QueryRowContext(ctx,
		`SELECT `+commentColumns+`
		 FROM lesson_comments c
		 JOIN users u ON u.id = c.user_id
		 JOIN lessons l ON l.id = c.lesson_id
		 WHERE c.id = ?`, id))
}

func (r *commentRepository) Create(ctx context.Context, comment *domain.Comment) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO lesson_comments (lesson_id, user_id, content) VALUES (?, ?, ?)`,
		comment.LessonID, comment.UserID, comment.Content)
	if err != nil {
		return err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	comment.ID = uint64(id)
	comment.CreatedAt = time.Now().UTC()
	return nil
}

func (r *commentRepository) Delete(ctx context.Context, id uint64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM lesson_comments WHERE id = ?`, id)
	return err
}

func scanComment(row rowScanner) (*domain.Comment, error) {
	var c domain.Comment
	err := row.Scan(&c.ID, &c.LessonID, &c.LessonSlug, &c.UserID, &c.UserName, &c.Content, &c.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}
