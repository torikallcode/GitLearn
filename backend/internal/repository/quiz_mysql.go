package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/gitlearn/backend/internal/domain"
)

type quizRepository struct {
	db *sql.DB
}

// NewQuizRepository builds a MySQL quiz repository.
func NewQuizRepository(db *sql.DB) QuizRepository {
	return &quizRepository{db: db}
}

func (r *quizRepository) ListByLesson(ctx context.Context, lessonID uint64) ([]domain.Quiz, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, lesson_id, question, explanation, order_no
		 FROM quizzes WHERE lesson_id = ? ORDER BY order_no, id`, lessonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	quizzes := make([]domain.Quiz, 0)
	ids := make([]uint64, 0)
	for rows.Next() {
		var q domain.Quiz
		if err := rows.Scan(&q.ID, &q.LessonID, &q.Question, &q.Explanation, &q.OrderNo); err != nil {
			return nil, err
		}
		quizzes = append(quizzes, q)
		ids = append(ids, q.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(quizzes) == 0 {
		return quizzes, nil
	}

	options, err := r.optionsByQuizIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range quizzes {
		quizzes[i].Options = options[quizzes[i].ID]
	}
	return quizzes, nil
}

func (r *quizRepository) GetByID(ctx context.Context, id uint64) (*domain.Quiz, error) {
	return r.getQuiz(ctx, id, false)
}

func (r *quizRepository) GetWithLesson(ctx context.Context, id uint64) (*domain.Quiz, error) {
	return r.getQuiz(ctx, id, true)
}

func (r *quizRepository) getQuiz(ctx context.Context, id uint64, withLesson bool) (*domain.Quiz, error) {
	var (
		q     domain.Quiz
		query string
	)
	if withLesson {
		query = `SELECT q.id, q.lesson_id, q.question, q.explanation, q.order_no, l.slug, l.title
		         FROM quizzes q JOIN lessons l ON l.id = q.lesson_id WHERE q.id = ?`
	} else {
		query = `SELECT q.id, q.lesson_id, q.question, q.explanation, q.order_no
		         FROM quizzes q WHERE q.id = ?`
	}

	var err error
	if withLesson {
		err = r.db.QueryRowContext(ctx, query, id).Scan(
			&q.ID, &q.LessonID, &q.Question, &q.Explanation, &q.OrderNo, &q.LessonSlug, &q.LessonTitle)
	} else {
		err = r.db.QueryRowContext(ctx, query, id).Scan(
			&q.ID, &q.LessonID, &q.Question, &q.Explanation, &q.OrderNo)
	}
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &q, nil
}

func (r *quizRepository) GetOptionsByQuizID(ctx context.Context, quizID uint64) ([]domain.QuizOption, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, quiz_id, option_text, is_correct, order_no
		 FROM quiz_options WHERE quiz_id = ? ORDER BY order_no, id`, quizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	options := make([]domain.QuizOption, 0)
	for rows.Next() {
		var o domain.QuizOption
		if err := rows.Scan(&o.ID, &o.QuizID, &o.OptionText, &o.IsCorrect, &o.OrderNo); err != nil {
			return nil, err
		}
		options = append(options, o)
	}
	return options, rows.Err()
}

func (r *quizRepository) GetOption(ctx context.Context, quizID, optionID uint64) (*domain.QuizOption, error) {
	var o domain.QuizOption
	err := r.db.QueryRowContext(ctx,
		`SELECT id, quiz_id, option_text, is_correct, order_no
		 FROM quiz_options WHERE id = ? AND quiz_id = ?`, optionID, quizID,
	).Scan(&o.ID, &o.QuizID, &o.OptionText, &o.IsCorrect, &o.OrderNo)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrInvalidOption
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *quizRepository) CountByLesson(ctx context.Context, lessonID uint64) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM quizzes WHERE lesson_id = ?`, lessonID).Scan(&count)
	return count, err
}

func (r *quizRepository) CountByLessonIDs(ctx context.Context, lessonIDs []uint64) (map[uint64]int, error) {
	out := make(map[uint64]int, len(lessonIDs))
	if len(lessonIDs) == 0 {
		return out, nil
	}

	placeholders := make([]string, len(lessonIDs))
	args := make([]any, len(lessonIDs))
	for i, id := range lessonIDs {
		placeholders[i] = "?"
		args[i] = id
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT lesson_id, COUNT(*) FROM quizzes WHERE lesson_id IN (`+strings.Join(placeholders, ",")+`)
		 GROUP BY lesson_id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			lessonID uint64
			count    int
		)
		if err := rows.Scan(&lessonID, &count); err != nil {
			return nil, err
		}
		out[lessonID] = count
	}
	return out, rows.Err()
}

func (r *quizRepository) optionsByQuizIDs(ctx context.Context, quizIDs []uint64) (map[uint64][]domain.QuizOption, error) {
	placeholders := make([]string, len(quizIDs))
	args := make([]any, len(quizIDs))
	for i, id := range quizIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, quiz_id, option_text, is_correct, order_no
		 FROM quiz_options WHERE quiz_id IN (`+strings.Join(placeholders, ",")+`)
		 ORDER BY quiz_id, order_no, id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[uint64][]domain.QuizOption, len(quizIDs))
	for rows.Next() {
		var o domain.QuizOption
		if err := rows.Scan(&o.ID, &o.QuizID, &o.OptionText, &o.IsCorrect, &o.OrderNo); err != nil {
			return nil, err
		}
		out[o.QuizID] = append(out[o.QuizID], o)
	}
	return out, rows.Err()
}
