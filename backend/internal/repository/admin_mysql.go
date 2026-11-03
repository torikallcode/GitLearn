package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/gitlearn/backend/internal/domain"
)

type adminRepository struct {
	db *sql.DB
}

// NewAdminRepository builds a MySQL admin content repository.
func NewAdminRepository(db *sql.DB) AdminRepository {
	return &adminRepository{db: db}
}

func (r *adminRepository) ListLessons(ctx context.Context) ([]domain.LessonContext, error) {
	query := `SELECT l.id, l.module_id, l.slug, l.title, l.content_md, l.estimated_minutes, l.order_no,
	                 l.practice_config, l.is_published, l.created_at, l.updated_at,
	                 m.title, m.order_no, p.id, p.slug, p.title, p.order_no, p.track,
	                 (SELECT COUNT(*) FROM quizzes q WHERE q.lesson_id = l.id)
	          FROM lessons l
	          JOIN modules m ON m.id = l.module_id
	          JOIN learning_paths p ON p.id = m.path_id
	          ORDER BY p.order_no, m.order_no, l.order_no, l.id`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.LessonContext, 0)
	for rows.Next() {
		var lc domain.LessonContext
		err := rows.Scan(
			&lc.ID, &lc.ModuleID, &lc.Slug, &lc.Title, &lc.ContentMD, &lc.EstimatedMinutes, &lc.OrderNo,
			&lc.PracticeConfig, &lc.IsPublished, &lc.CreatedAt, &lc.UpdatedAt,
			&lc.ModuleTitle, &lc.ModuleOrderNo,
			&lc.PathID, &lc.PathSlug, &lc.PathTitle, &lc.PathOrderNo, &lc.PathTrack,
			&lc.QuizCount,
		)
		if err != nil {
			return nil, err
		}
		out = append(out, lc)
	}
	return out, rows.Err()
}

func (r *adminRepository) GetLesson(ctx context.Context, id uint64) (*domain.LessonContext, error) {
	query := `SELECT l.id, l.module_id, l.slug, l.title, l.content_md, l.estimated_minutes, l.order_no,
	                 l.practice_config, l.is_published, l.created_at, l.updated_at,
	                 m.title, m.order_no, p.id, p.slug, p.title, p.order_no, p.track
	          FROM lessons l
	          JOIN modules m ON m.id = l.module_id
	          JOIN learning_paths p ON p.id = m.path_id
	          WHERE l.id = ?`
	var lc domain.LessonContext
	err := r.db.QueryRowContext(ctx, query, id).Scan(
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

func (r *adminRepository) UpdateLesson(ctx context.Context, lesson *domain.Lesson) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE lessons
		 SET title = ?, content_md = ?, estimated_minutes = ?, order_no = ?, is_published = ?
		 WHERE id = ?`,
		lesson.Title, lesson.ContentMD, lesson.EstimatedMinutes, lesson.OrderNo, lesson.IsPublished, lesson.ID)
	return err
}

func (r *adminRepository) GetQuiz(ctx context.Context, id uint64) (*domain.Quiz, error) {
	var q domain.Quiz
	err := r.db.QueryRowContext(ctx,
		`SELECT id, lesson_id, question, explanation, order_no FROM quizzes WHERE id = ?`, id,
	).Scan(&q.ID, &q.LessonID, &q.Question, &q.Explanation, &q.OrderNo)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	options, err := r.options(ctx, q.ID)
	if err != nil {
		return nil, err
	}
	q.Options = options
	return &q, nil
}

func (r *adminRepository) CreateQuiz(ctx context.Context, quiz *domain.Quiz) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx,
		`INSERT INTO quizzes (lesson_id, question, explanation, order_no) VALUES (?, ?, ?, ?)`,
		quiz.LessonID, quiz.Question, quiz.Explanation, quiz.OrderNo)
	if err != nil {
		return err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	quiz.ID = uint64(id)
	if err := insertOptions(ctx, tx, quiz); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *adminRepository) UpdateQuiz(ctx context.Context, quiz *domain.Quiz) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx,
		`UPDATE quizzes SET question = ?, explanation = ?, order_no = ? WHERE id = ?`,
		quiz.Question, quiz.Explanation, quiz.OrderNo, quiz.ID)
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM quiz_options WHERE quiz_id = ?`, quiz.ID); err != nil {
		return err
	}
	if err := insertOptions(ctx, tx, quiz); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *adminRepository) DeleteQuiz(ctx context.Context, id uint64) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM quizzes WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err == nil && n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *adminRepository) options(ctx context.Context, quizID uint64) ([]domain.QuizOption, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, quiz_id, option_text, is_correct, order_no
		 FROM quiz_options WHERE quiz_id = ? ORDER BY order_no, id`, quizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.QuizOption, 0)
	for rows.Next() {
		var o domain.QuizOption
		if err := rows.Scan(&o.ID, &o.QuizID, &o.OptionText, &o.IsCorrect, &o.OrderNo); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func insertOptions(ctx context.Context, tx *sql.Tx, quiz *domain.Quiz) error {
	for i, o := range quiz.Options {
		order := o.OrderNo
		if order == 0 {
			order = i + 1
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO quiz_options (quiz_id, option_text, is_correct, order_no) VALUES (?, ?, ?, ?)`,
			quiz.ID, o.OptionText, o.IsCorrect, order); err != nil {
			return err
		}
	}
	return nil
}
