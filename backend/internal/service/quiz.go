package service

import (
	"context"
	"errors"
	"math"
	"time"

	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/repository"
)

// QuizService grades answers and manages spaced-repetition reviews.
type QuizService interface {
	Answer(ctx context.Context, userID, quizID, optionID uint64) (*dto.QuizAnswerResponse, error)
	ReviewsToday(ctx context.Context, userID uint64) ([]dto.ReviewToday, error)
	AnswerReview(ctx context.Context, userID, reviewID, optionID uint64) (*dto.ReviewAnswerResponse, error)
}

type quizService struct {
	quizzes  repository.QuizRepository
	progress repository.ProgressRepository
	attempts repository.AttemptRepository
	reviews  repository.ReviewRepository
	now      func() time.Time
}

// NewQuizService builds the quiz service.
func NewQuizService(
	quizzes repository.QuizRepository,
	progress repository.ProgressRepository,
	attempts repository.AttemptRepository,
	reviews repository.ReviewRepository,
) QuizService {
	return &quizService{
		quizzes:  quizzes,
		progress: progress,
		attempts: attempts,
		reviews:  reviews,
		now:      time.Now,
	}
}

func (s *quizService) Answer(ctx context.Context, userID, quizID, optionID uint64) (*dto.QuizAnswerResponse, error) {
	quiz, err := s.quizzes.GetByID(ctx, quizID)
	if err != nil {
		return nil, err
	}
	selected, correct, err := s.gradeOption(ctx, quiz.ID, optionID)
	if err != nil {
		return nil, err
	}

	now := s.now().UTC()
	attempt := &domain.QuizAttempt{
		UserID:           userID,
		QuizID:           quiz.ID,
		SelectedOptionID: selected.ID,
		IsCorrect:        selected.IsCorrect,
		AttemptedAt:      now,
	}
	if err := s.attempts.Create(ctx, attempt); err != nil {
		return nil, err
	}

	score, total, err := s.recordScore(ctx, userID, quiz.LessonID)
	if err != nil {
		return nil, err
	}

	if !selected.IsCorrect {
		if err := s.reviews.Upsert(ctx, &domain.ReviewItem{
			UserID:       userID,
			QuizID:       quiz.ID,
			NextReviewAt: now.AddDate(0, 0, 1),
			IntervalDays: 1,
			Ease:         2.5,
		}); err != nil {
			return nil, err
		}
	}

	return &dto.QuizAnswerResponse{
		IsCorrect:        selected.IsCorrect,
		CorrectOptionID:  correct.ID,
		Explanation:      quiz.Explanation,
		SelectedOptionID: selected.ID,
		QuizScore:        score,
		QuizTotal:        total,
	}, nil
}

func (s *quizService) ReviewsToday(ctx context.Context, userID uint64) ([]dto.ReviewToday, error) {
	items, err := s.reviews.ListDue(ctx, userID, s.now().UTC())
	if err != nil {
		return nil, err
	}

	out := make([]dto.ReviewToday, 0, len(items))
	for _, item := range items {
		options, err := s.quizzes.GetOptionsByQuizID(ctx, item.QuizID)
		if err != nil {
			return nil, err
		}
		out = append(out, dto.ReviewToday{
			ID:           item.ID,
			QuizID:       item.QuizID,
			Question:     item.Question,
			Options:      publicOptions(options),
			LessonSlug:   item.LessonSlug,
			LessonTitle:  item.LessonTitle,
			NextReviewAt: item.NextReviewAt,
			IntervalDays: item.IntervalDays,
		})
	}
	return out, nil
}

func (s *quizService) AnswerReview(ctx context.Context, userID, reviewID, optionID uint64) (*dto.ReviewAnswerResponse, error) {
	item, err := s.reviews.GetForUser(ctx, reviewID, userID)
	if err != nil {
		return nil, err
	}
	quiz, err := s.quizzes.GetWithLesson(ctx, item.QuizID)
	if err != nil {
		return nil, err
	}
	selected, correct, err := s.gradeOption(ctx, quiz.ID, optionID)
	if err != nil {
		return nil, err
	}

	now := s.now().UTC()
	if err := s.attempts.Create(ctx, &domain.QuizAttempt{
		UserID:           userID,
		QuizID:           quiz.ID,
		SelectedOptionID: selected.ID,
		IsCorrect:        selected.IsCorrect,
		AttemptedAt:      now,
	}); err != nil {
		return nil, err
	}

	score, total, err := s.recordScore(ctx, userID, quiz.LessonID)
	if err != nil {
		return nil, err
	}

	interval := 1
	ease := item.Ease
	if ease <= 0 {
		ease = 2.5
	}
	if selected.IsCorrect {
		base := item.IntervalDays
		if base < 1 {
			base = 1
		}
		interval = int(math.Round(float64(base) * ease))
		if interval < 1 {
			interval = 1
		}
	}
	next := now.AddDate(0, 0, interval)
	if err := s.reviews.UpdateSchedule(ctx, reviewID, userID, interval, ease, next); err != nil {
		return nil, err
	}

	return &dto.ReviewAnswerResponse{
		QuizAnswerResponse: dto.QuizAnswerResponse{
			IsCorrect:        selected.IsCorrect,
			CorrectOptionID:  correct.ID,
			Explanation:      quiz.Explanation,
			SelectedOptionID: selected.ID,
			QuizScore:        score,
			QuizTotal:        total,
		},
		ReviewID: reviewID,
	}, nil
}

func (s *quizService) gradeOption(ctx context.Context, quizID, optionID uint64) (*domain.QuizOption, *domain.QuizOption, error) {
	options, err := s.quizzes.GetOptionsByQuizID(ctx, quizID)
	if err != nil {
		return nil, nil, err
	}
	var selected, correct *domain.QuizOption
	for i := range options {
		if options[i].ID == optionID {
			selected = &options[i]
		}
		if options[i].IsCorrect {
			correct = &options[i]
		}
	}
	if selected == nil || correct == nil {
		return nil, nil, domain.ErrInvalidOption
	}
	return selected, correct, nil
}

func (s *quizService) recordScore(ctx context.Context, userID, lessonID uint64) (int, int, error) {
	score, err := s.attempts.CountDistinctCorrectByLesson(ctx, userID, lessonID)
	if err != nil {
		return 0, 0, err
	}
	total, err := s.quizzes.CountByLesson(ctx, lessonID)
	if err != nil {
		return 0, 0, err
	}

	p, err := s.progress.Get(ctx, userID, lessonID)
	if errors.Is(err, domain.ErrNotFound) {
		p = &domain.Progress{UserID: userID, LessonID: lessonID, Status: domain.StatusNotStarted}
	} else if err != nil {
		return 0, 0, err
	}
	if p.Status != domain.StatusCompleted {
		p.Status = domain.StatusInProgress
	}
	p.QuizScore = score
	if err := s.progress.Save(ctx, p); err != nil {
		return 0, 0, err
	}
	return score, total, nil
}
