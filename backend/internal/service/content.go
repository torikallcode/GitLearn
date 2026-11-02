package service

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/repository"
)

// ContentService serves the public curriculum catalog with optional progress
// overlays for authenticated users.
type ContentService interface {
	ListPaths(ctx context.Context, userID *uint64) ([]dto.PathSummary, error)
	GetPath(ctx context.Context, slug string, userID *uint64) (*dto.PathDetail, error)
	GetLesson(ctx context.Context, slug string, userID *uint64) (*dto.LessonDetail, error)
	ListQuizzes(ctx context.Context, slug string) ([]dto.Quiz, error)
	Cheatsheet(ctx context.Context, query string) ([]dto.CheatsheetItem, error)
	Search(ctx context.Context, query string) (*dto.SearchResponse, error)
}

type contentService struct {
	content  repository.ContentRepository
	quizzes  repository.QuizRepository
	progress repository.ProgressRepository
}

// NewContentService builds the content service.
func NewContentService(content repository.ContentRepository, quizzes repository.QuizRepository, progress repository.ProgressRepository) ContentService {
	return &contentService{content: content, quizzes: quizzes, progress: progress}
}

func (s *contentService) ListPaths(ctx context.Context, userID *uint64) ([]dto.PathSummary, error) {
	paths, err := s.content.ListPaths(ctx)
	if err != nil {
		return nil, err
	}
	progress, err := s.progressByLesson(ctx, userID)
	if err != nil {
		return nil, err
	}
	completed := make(map[uint64]bool)

	out := make([]dto.PathSummary, 0, len(paths))
	for _, p := range paths {
		modules, err := s.content.ListModulesByPath(ctx, p.ID)
		if err != nil {
			return nil, err
		}
		lessons, err := s.content.ListLessonContextsByPath(ctx, p.ID)
		if err != nil {
			return nil, err
		}
		done := 0
		for _, l := range lessons {
			if progressStatus(progress[l.ID]) == domain.StatusCompleted {
				done++
				completed[l.ID] = true
			}
		}
		out = append(out, dto.PathSummary{
			ID:               p.ID,
			Slug:             p.Slug,
			Title:            p.Title,
			Description:      p.Description,
			OrderNo:          p.OrderNo,
			Track:            p.Track,
			ModuleCount:      len(modules),
			LessonCount:      len(lessons),
			CompletedLessons: done,
			ProgressPercent:  percent(done, len(lessons)),
		})
	}
	return out, nil
}

func (s *contentService) GetPath(ctx context.Context, slug string, userID *uint64) (*dto.PathDetail, error) {
	path, err := s.content.GetPathBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	modules, err := s.content.ListModulesByPath(ctx, path.ID)
	if err != nil {
		return nil, err
	}
	lessons, err := s.content.ListLessonContextsByPath(ctx, path.ID)
	if err != nil {
		return nil, err
	}
	progress, err := s.progressByLesson(ctx, userID)
	if err != nil {
		return nil, err
	}

	ids := make([]uint64, 0, len(lessons))
	byModule := make(map[uint64][]domain.LessonContext, len(modules))
	for _, l := range lessons {
		ids = append(ids, l.ID)
		byModule[l.ModuleID] = append(byModule[l.ModuleID], l)
	}
	quizTotals, err := s.quizzes.CountByLessonIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	locked := lockedLessons(lessons, progress)

	completedLessons := 0
	moduleSummaries := make([]dto.ModuleSummary, 0, len(modules))
	for _, m := range modules {
		moduleLessons := byModule[m.ID]
		lessonSummaries := make([]dto.LessonSummary, 0, len(moduleLessons))
		done := 0
		for _, l := range moduleLessons {
			summary := mapLessonSummary(l, progress[l.ID], quizTotalFor(quizTotals, l.ID), locked[l.ID])
			if summary.Status == domain.StatusCompleted {
				done++
			}
			lessonSummaries = append(lessonSummaries, summary)
		}
		completedLessons += done
		moduleSummaries = append(moduleSummaries, dto.ModuleSummary{
			ID:               m.ID,
			Title:            m.Title,
			Description:      m.Description,
			OrderNo:          m.OrderNo,
			LessonCount:      len(moduleLessons),
			CompletedLessons: done,
			ProgressPercent:  percent(done, len(moduleLessons)),
			Lessons:          lessonSummaries,
		})
	}

	return &dto.PathDetail{
		Path: dto.PathSummary{
			ID:               path.ID,
			Slug:             path.Slug,
			Title:            path.Title,
			Description:      path.Description,
			OrderNo:          path.OrderNo,
			Track:            path.Track,
			ModuleCount:      len(modules),
			LessonCount:      len(lessons),
			CompletedLessons: completedLessons,
			ProgressPercent:  percent(completedLessons, len(lessons)),
		},
		Modules: moduleSummaries,
	}, nil
}

func (s *contentService) GetLesson(ctx context.Context, slug string, userID *uint64) (*dto.LessonDetail, error) {
	lesson, err := s.content.GetLessonContextBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	pathLessons, err := s.content.ListLessonContextsByPath(ctx, lesson.PathID)
	if err != nil {
		return nil, err
	}

	var p *domain.Progress
	if userID != nil {
		p, err = s.progress.Get(ctx, *userID, lesson.ID)
		if err != nil && err != domain.ErrNotFound {
			return nil, err
		}
		if err == domain.ErrNotFound {
			p = nil
		}
	}

	quizTotal, err := s.quizzes.CountByLesson(ctx, lesson.ID)
	if err != nil {
		return nil, err
	}

	index := -1
	for i, l := range pathLessons {
		if l.ID == lesson.ID {
			index = i
			break
		}
	}
	locked := false
	if index > 0 {
		prev := pathLessons[index-1]
		var prevProgress *domain.Progress
		if userID != nil {
			prevProgress, err = s.progress.Get(ctx, *userID, prev.ID)
			if err != nil && err != domain.ErrNotFound {
				return nil, err
			}
		}
		locked = progressStatus(prevProgress) != domain.StatusCompleted
	}

	var prevSlug, nextSlug *string
	if index > 0 {
		v := pathLessons[index-1].Slug
		prevSlug = &v
	}
	if index >= 0 && index+1 < len(pathLessons) {
		v := pathLessons[index+1].Slug
		nextSlug = &v
	}

	var practiceConfig json.RawMessage
	if len(lesson.PracticeConfig) > 0 {
		practiceConfig = json.RawMessage(lesson.PracticeConfig)
	}

	status := progressStatus(p)
	practiceDone := false
	quizScore := 0
	if p != nil {
		practiceDone = p.PracticeDone
		quizScore = p.QuizScore
	}

	return &dto.LessonDetail{
		ID:               lesson.ID,
		Slug:             lesson.Slug,
		Title:            lesson.Title,
		ContentMD:        lesson.ContentMD,
		EstimatedMinutes: lesson.EstimatedMinutes,
		OrderNo:          lesson.OrderNo,
		Module: dto.LessonModule{
			ID:    lesson.ModuleID,
			Title: lesson.ModuleTitle,
			Path:  dto.LessonPath{Slug: lesson.PathSlug, Title: lesson.PathTitle},
		},
		PracticeConfig: practiceConfig,
		Status:         status,
		PracticeDone:   practiceDone,
		QuizScore:      quizScore,
		QuizTotal:      quizTotal,
		PrevSlug:       prevSlug,
		NextSlug:       nextSlug,
		Locked:         locked,
	}, nil
}

func (s *contentService) ListQuizzes(ctx context.Context, slug string) ([]dto.Quiz, error) {
	lesson, err := s.content.GetLessonBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	quizzes, err := s.quizzes.ListByLesson(ctx, lesson.ID)
	if err != nil {
		return nil, err
	}

	out := make([]dto.Quiz, 0, len(quizzes))
	for _, q := range quizzes {
		out = append(out, dto.Quiz{
			ID:       q.ID,
			Question: q.Question,
			Options:  publicOptions(q.Options),
		})
	}
	return out, nil
}

func (s *contentService) Cheatsheet(ctx context.Context, query string) ([]dto.CheatsheetItem, error) {
	items, err := s.content.ListCheatsheet(ctx, strings.TrimSpace(query))
	if err != nil {
		return nil, err
	}
	return mapCheatsheet(items), nil
}

func (s *contentService) Search(ctx context.Context, query string) (*dto.SearchResponse, error) {
	query = strings.TrimSpace(query)
	resp := &dto.SearchResponse{
		Lessons:    make([]dto.SearchLesson, 0),
		Cheatsheet: make([]dto.CheatsheetItem, 0),
	}
	if query == "" {
		return resp, nil
	}

	lessons, err := s.content.SearchLessons(ctx, query, 20)
	if err != nil {
		return nil, err
	}
	resp.Lessons = make([]dto.SearchLesson, 0, len(lessons))
	for _, l := range lessons {
		resp.Lessons = append(resp.Lessons, dto.SearchLesson{
			Slug:        l.Slug,
			Title:       l.Title,
			PathTitle:   l.PathTitle,
			ModuleTitle: l.ModuleTitle,
		})
	}

	items, err := s.content.SearchCheatsheet(ctx, query, 20)
	if err != nil {
		return nil, err
	}
	resp.Cheatsheet = mapCheatsheet(items)
	return resp, nil
}

func (s *contentService) progressByLesson(ctx context.Context, userID *uint64) (map[uint64]*domain.Progress, error) {
	if userID == nil {
		return map[uint64]*domain.Progress{}, nil
	}
	items, err := s.progress.ListByUser(ctx, *userID)
	if err != nil {
		return nil, err
	}
	return progressMap(items), nil
}

func lockedLessons(lessons []domain.LessonContext, progress map[uint64]*domain.Progress) map[uint64]bool {
	out := make(map[uint64]bool, len(lessons))
	for i, l := range lessons {
		if i == 0 {
			out[l.ID] = false
			continue
		}
		out[l.ID] = progressStatus(progress[lessons[i-1].ID]) != domain.StatusCompleted
	}
	return out
}
