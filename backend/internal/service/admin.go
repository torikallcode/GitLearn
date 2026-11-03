package service

import (
	"context"
	"strings"

	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/repository"
)

// AdminService implements the lesson/quiz CMS.
type AdminService interface {
	ListLessons(ctx context.Context) ([]dto.AdminLesson, error)
	GetLesson(ctx context.Context, id uint64) (*dto.AdminLesson, error)
	UpdateLesson(ctx context.Context, id uint64, req dto.UpdateLessonRequest) (*dto.AdminLesson, error)
	ListQuizzes(ctx context.Context, lessonID uint64) ([]dto.AdminQuiz, error)
	CreateQuiz(ctx context.Context, lessonID uint64, req dto.QuizUpsertRequest) (*dto.AdminQuiz, error)
	UpdateQuiz(ctx context.Context, id uint64, req dto.QuizUpsertRequest) (*dto.AdminQuiz, error)
	DeleteQuiz(ctx context.Context, id uint64) error
}

type adminService struct {
	admin   repository.AdminRepository
	quizzes repository.QuizRepository
}

// NewAdminService builds the admin service.
func NewAdminService(admin repository.AdminRepository, quizzes repository.QuizRepository) AdminService {
	return &adminService{admin: admin, quizzes: quizzes}
}

func (s *adminService) ListLessons(ctx context.Context) ([]dto.AdminLesson, error) {
	items, err := s.admin.ListLessons(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]dto.AdminLesson, 0, len(items))
	for _, lc := range items {
		out = append(out, mapAdminLesson(lc))
	}
	return out, nil
}

func (s *adminService) GetLesson(ctx context.Context, id uint64) (*dto.AdminLesson, error) {
	lc, err := s.admin.GetLesson(ctx, id)
	if err != nil {
		return nil, err
	}
	quizzes, err := s.quizzes.CountByLesson(ctx, id)
	if err != nil {
		return nil, err
	}
	lc.QuizCount = quizzes
	out := mapAdminLesson(*lc)
	return &out, nil
}

func (s *adminService) UpdateLesson(ctx context.Context, id uint64, req dto.UpdateLessonRequest) (*dto.AdminLesson, error) {
	lc, err := s.admin.GetLesson(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			return nil, domain.WrapValidation("title", "wajib diisi")
		}
		lc.Title = title
	}
	if req.ContentMD != nil {
		lc.ContentMD = *req.ContentMD
	}
	if req.EstimatedMinutes != nil {
		lc.EstimatedMinutes = *req.EstimatedMinutes
	}
	if req.OrderNo != nil {
		lc.OrderNo = *req.OrderNo
	}
	if req.IsPublished != nil {
		lc.IsPublished = *req.IsPublished
	}
	if err := s.admin.UpdateLesson(ctx, &lc.Lesson); err != nil {
		return nil, err
	}
	return s.GetLesson(ctx, id)
}

func (s *adminService) ListQuizzes(ctx context.Context, lessonID uint64) ([]dto.AdminQuiz, error) {
	if _, err := s.admin.GetLesson(ctx, lessonID); err != nil {
		return nil, err
	}
	items, err := s.quizzes.ListByLesson(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.AdminQuiz, 0, len(items))

	for _, q := range items {
		out = append(out, mapAdminQuiz(q))
	}
	return out, nil
}

func (s *adminService) CreateQuiz(ctx context.Context, lessonID uint64, req dto.QuizUpsertRequest) (*dto.AdminQuiz, error) {
	if _, err := s.admin.GetLesson(ctx, lessonID); err != nil {
		return nil, err
	}
	quiz, err := quizFromRequest(lessonID, 0, req)
	if err != nil {
		return nil, err
	}
	if err := s.admin.CreateQuiz(ctx, quiz); err != nil {
		return nil, err
	}
	out := mapAdminQuiz(*quiz)
	return &out, nil
}

func (s *adminService) UpdateQuiz(ctx context.Context, id uint64, req dto.QuizUpsertRequest) (*dto.AdminQuiz, error) {
	existing, err := s.admin.GetQuiz(ctx, id)
	if err != nil {
		return nil, err
	}
	quiz, err := quizFromRequest(existing.LessonID, id, req)
	if err != nil {
		return nil, err
	}
	if err := s.admin.UpdateQuiz(ctx, quiz); err != nil {
		return nil, err
	}
	out := mapAdminQuiz(*quiz)
	return &out, nil
}

func (s *adminService) DeleteQuiz(ctx context.Context, id uint64) error {
	return s.admin.DeleteQuiz(ctx, id)
}

func quizFromRequest(lessonID, quizID uint64, req dto.QuizUpsertRequest) (*domain.Quiz, error) {
	correct := 0
	options := make([]domain.QuizOption, 0, len(req.Options))
	for i, o := range req.Options {
		text := strings.TrimSpace(o.OptionText)
		if text == "" {
			return nil, domain.WrapValidation("options", "teks opsi wajib diisi")
		}
		if o.IsCorrect {
			correct++
		}
		options = append(options, domain.QuizOption{
			QuizID:     quizID,
			OptionText: text,
			IsCorrect:  o.IsCorrect,
			OrderNo:    i + 1,
		})
	}
	if correct != 1 {
		return nil, domain.WrapValidation("options", "harus ada tepat satu jawaban benar")
	}
	order := req.OrderNo
	if order == 0 {
		order = 1
	}
	return &domain.Quiz{
		ID:          quizID,
		LessonID:    lessonID,
		Question:    strings.TrimSpace(req.Question),
		Explanation: strings.TrimSpace(req.Explanation),
		OrderNo:     order,
		Options:     options,
	}, nil
}

func mapAdminLesson(lc domain.LessonContext) dto.AdminLesson {
	return dto.AdminLesson{
		ID:               lc.ID,
		ModuleID:         lc.ModuleID,
		Slug:             lc.Slug,
		Title:            lc.Title,
		ContentMD:        lc.ContentMD,
		EstimatedMinutes: lc.EstimatedMinutes,
		OrderNo:          lc.OrderNo,
		IsPublished:      lc.IsPublished,
		ModuleTitle:      lc.ModuleTitle,
		PathSlug:         lc.PathSlug,
		PathTitle:        lc.PathTitle,
		QuizCount:        lc.QuizCount,
	}
}

func mapAdminQuiz(q domain.Quiz) dto.AdminQuiz {
	options := make([]dto.AdminQuizOption, 0, len(q.Options))
	for _, o := range q.Options {
		options = append(options, dto.AdminQuizOption{
			ID:         o.ID,
			OptionText: o.OptionText,
			IsCorrect:  o.IsCorrect,
			OrderNo:    o.OrderNo,
		})
	}
	return dto.AdminQuiz{
		ID:          q.ID,
		LessonID:    q.LessonID,
		Question:    q.Question,
		Explanation: q.Explanation,
		OrderNo:     q.OrderNo,
		Options:     options,
	}
}
