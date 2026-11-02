package service

import (
	"context"
	"errors"
	"time"

	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/repository"
)

const (
	xpPractice       = 10
	xpLessonComplete = 20
	xpPerQuizCorrect = 5
)

// ProgressService implements practice, completion, unlocking and badge rules.
type ProgressService interface {
	CompletePractice(ctx context.Context, userID uint64, slug string) (*dto.PracticeResponse, error)
	CompleteLesson(ctx context.Context, userID uint64, slug string) (*dto.CompleteLessonResponse, error)
	GetProgress(ctx context.Context, userID uint64) (*dto.ProgressResponse, error)
	Next(ctx context.Context, userID uint64) (*dto.LessonRef, error)
}

type progressService struct {
	content  repository.ContentRepository
	quizzes  repository.QuizRepository
	progress repository.ProgressRepository
	attempts repository.AttemptRepository
	stats    repository.StatsRepository
	badges   repository.BadgeRepository
	now      func() time.Time
}

// NewProgressService builds the progress service.
func NewProgressService(
	content repository.ContentRepository,
	quizzes repository.QuizRepository,
	progress repository.ProgressRepository,
	attempts repository.AttemptRepository,
	stats repository.StatsRepository,
	badges repository.BadgeRepository,
) ProgressService {
	return &progressService{
		content:  content,
		quizzes:  quizzes,
		progress: progress,
		attempts: attempts,
		stats:    stats,
		badges:   badges,
		now:      time.Now,
	}
}

func (s *progressService) CompletePractice(ctx context.Context, userID uint64, slug string) (*dto.PracticeResponse, error) {
	lesson, err := s.content.GetLessonContextBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	p, err := s.getProgress(ctx, userID, lesson.ID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		p = &domain.Progress{UserID: userID, LessonID: lesson.ID, Status: domain.StatusNotStarted}
	}

	if !p.PracticeDone {
		p.PracticeDone = true
		if p.Status != domain.StatusCompleted {
			p.Status = domain.StatusInProgress
		}
		if err := s.progress.Save(ctx, p); err != nil {
			return nil, err
		}
		if _, err := s.addXP(ctx, userID, xpPractice); err != nil {
			return nil, err
		}
	}

	return &dto.PracticeResponse{Status: p.Status, PracticeDone: true}, nil
}

func (s *progressService) CompleteLesson(ctx context.Context, userID uint64, slug string) (*dto.CompleteLessonResponse, error) {
	lesson, err := s.content.GetLessonContextBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	pathLessons, err := s.content.ListLessonContextsByPath(ctx, lesson.PathID)
	if err != nil {
		return nil, err
	}

	p, err := s.getProgress(ctx, userID, lesson.ID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		p = &domain.Progress{UserID: userID, LessonID: lesson.ID, Status: domain.StatusNotStarted}
	}
	alreadyCompleted := p.Status == domain.StatusCompleted

	if !alreadyCompleted {
		for i, l := range pathLessons {
			if l.ID != lesson.ID || i == 0 {
				continue
			}
			prev, err := s.getProgress(ctx, userID, pathLessons[i-1].ID)
			if err != nil {
				return nil, err
			}
			if progressStatus(prev) != domain.StatusCompleted {
				return nil, domain.ErrLessonLocked
			}
			break
		}
	}
	if lesson.HasPractice() && !p.PracticeDone {
		return nil, domain.ErrPracticeRequired
	}

	total, err := s.quizzes.CountByLesson(ctx, lesson.ID)
	if err != nil {
		return nil, err
	}
	score, err := s.attempts.CountDistinctCorrectByLesson(ctx, userID, lesson.ID)
	if err != nil {
		return nil, err
	}
	if score > total {
		score = total
	}
	answered, err := s.attempts.CountDistinctAnsweredByLesson(ctx, userID, lesson.ID)
	if err != nil {
		return nil, err
	}
	if total > 0 && answered < total {
		return nil, domain.ErrQuizRequired
	}

	p.QuizScore = score
	p.Status = domain.StatusCompleted
	if p.CompletedAt == nil {
		now := s.now().UTC()
		p.CompletedAt = &now
	}
	if err := s.progress.Save(ctx, p); err != nil {
		return nil, err
	}

	xp := 0
	if !alreadyCompleted {
		xp = xpLessonComplete + xpPerQuizCorrect*score
	}

	stats, err := s.loadStats(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !alreadyCompleted {
		stats.XP += xp
		applyStreak(stats, s.now())
		if err := s.stats.Save(ctx, stats); err != nil {
			return nil, err
		}
	}

	earned, err := s.evaluateBadges(ctx, userID, lesson, score, total, *stats, pathLessons)
	if err != nil {
		return nil, err
	}

	var nextSlug *string
	for i, l := range pathLessons {
		if l.ID == lesson.ID && i+1 < len(pathLessons) {
			v := pathLessons[i+1].Slug
			nextSlug = &v
			break
		}
	}

	return &dto.CompleteLessonResponse{
		Status:         domain.StatusCompleted,
		XPEarned:       xp,
		Badges:         earned,
		NextLessonSlug: nextSlug,
	}, nil
}

func (s *progressService) GetProgress(ctx context.Context, userID uint64) (*dto.ProgressResponse, error) {
	paths, err := s.content.ListPaths(ctx)
	if err != nil {
		return nil, err
	}
	allLessons, err := s.content.ListPublishedLessonContexts(ctx)
	if err != nil {
		return nil, err
	}
	items, err := s.progress.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	progress := progressMap(items)
	completed := completedSet(items)

	byModule := make(map[uint64][]domain.LessonContext, len(allLessons))
	for _, l := range allLessons {
		byModule[l.ModuleID] = append(byModule[l.ModuleID], l)
	}

	modules := make([]dto.ModuleProgress, 0)
	lessonsCompleted := 0
	for _, path := range paths {
		pathModules, err := s.content.ListModulesByPath(ctx, path.ID)
		if err != nil {
			return nil, err
		}
		for _, m := range pathModules {
			moduleLessons := byModule[m.ID]
			done := 0
			for _, l := range moduleLessons {
				if progressStatus(progress[l.ID]) == domain.StatusCompleted {
					done++
				}
			}
			lessonsCompleted += done
			modules = append(modules, dto.ModuleProgress{
				PathSlug:         path.Slug,
				PathTitle:        path.Title,
				ModuleTitle:      m.Title,
				LessonCount:      len(moduleLessons),
				CompletedLessons: done,
				ProgressPercent:  percent(done, len(moduleLessons)),
			})
		}
	}

	stats, err := s.loadStats(ctx, userID)
	if err != nil {
		return nil, err
	}
	earnedBadges, err := s.badges.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	var next *dto.LessonRef
	if lc := firstUnlocked(allLessons, completed); lc != nil {
		next = &dto.LessonRef{
			Slug:        lc.Slug,
			Title:       lc.Title,
			PathSlug:    lc.PathSlug,
			PathTitle:   lc.PathTitle,
			ModuleTitle: lc.ModuleTitle,
		}
	}

	return &dto.ProgressResponse{
		CompletionPercent: percent(lessonsCompleted, len(allLessons)),
		LessonsCompleted:  lessonsCompleted,
		LessonsTotal:      len(allLessons),
		Modules:           modules,
		NextLesson:        next,
		Stats:             mapStats(*stats),
		Badges:            mapBadges(earnedBadges),
	}, nil
}

func (s *progressService) Next(ctx context.Context, userID uint64) (*dto.LessonRef, error) {
	allLessons, err := s.content.ListPublishedLessonContexts(ctx)
	if err != nil {
		return nil, err
	}
	items, err := s.progress.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	lc := firstUnlocked(allLessons, completedSet(items))
	if lc == nil {
		return nil, nil
	}
	return &dto.LessonRef{
		Slug:        lc.Slug,
		Title:       lc.Title,
		PathSlug:    lc.PathSlug,
		PathTitle:   lc.PathTitle,
		ModuleTitle: lc.ModuleTitle,
	}, nil
}

func (s *progressService) evaluateBadges(
	ctx context.Context,
	userID uint64,
	lesson *domain.LessonContext,
	quizScore, quizTotal int,
	stats domain.Stats,
	pathLessons []domain.LessonContext,
) ([]dto.Badge, error) {
	definitions, err := s.badges.ListDefinitions(ctx)
	if err != nil {
		return nil, err
	}
	if len(definitions) == 0 {
		return []dto.Badge{}, nil
	}
	earnedBadges, err := s.badges.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	earned := make(map[string]bool, len(earnedBadges))
	for _, b := range earnedBadges {
		earned[b.Code] = true
	}
	items, err := s.progress.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	completed := completedSet(items)

	eligible := map[string]bool{
		domain.BadgeFirstStep: len(completed) >= 1,
		domain.BadgeQuizAce:   quizTotal > 0 && quizScore >= quizTotal,
		domain.BadgeStreak3:   stats.CurrentStreak >= 3,
		domain.BadgeStreak7:   stats.CurrentStreak >= 7,
	}

	if lesson.PathSlug == "git-fundamental" {
		eligible[domain.BadgePathFundamental] = allCompleted(pathLessons, completed)
	} else if fundamental, err := s.content.GetPathBySlug(ctx, "git-fundamental"); err == nil {
		lessons, err := s.content.ListLessonContextsByPath(ctx, fundamental.ID)
		if err != nil {
			return nil, err
		}
		eligible[domain.BadgePathFundamental] = allCompleted(lessons, completed)
	}

	if !earned[domain.BadgeAllCore] {
		paths, err := s.content.ListPaths(ctx)
		if err != nil {
			return nil, err
		}
		coreCount := 0
		allCore := true
		for _, p := range paths {
			if p.Track != "core" {
				continue
			}
			coreCount++
			lessons, err := s.content.ListLessonContextsByPath(ctx, p.ID)
			if err != nil {
				return nil, err
			}
			if !allCompleted(lessons, completed) {
				allCore = false
			}
		}
		eligible[domain.BadgeAllCore] = coreCount > 0 && allCore
	}

	now := s.now().UTC()
	newlyEarned := make([]dto.Badge, 0)
	for _, def := range definitions {
		if earned[def.Code] || !eligible[def.Code] {
			continue
		}
		if err := s.badges.Award(ctx, userID, def.ID, now); err != nil {
			return nil, err
		}
		def.EarnedAt = &now
		newlyEarned = append(newlyEarned, mapBadge(def))
	}
	return newlyEarned, nil
}

func (s *progressService) getProgress(ctx context.Context, userID, lessonID uint64) (*domain.Progress, error) {
	p, err := s.progress.Get(ctx, userID, lessonID)
	if errors.Is(err, domain.ErrNotFound) {
		return nil, nil
	}
	return p, err
}

func (s *progressService) loadStats(ctx context.Context, userID uint64) (*domain.Stats, error) {
	stats, err := s.stats.Get(ctx, userID)
	if errors.Is(err, domain.ErrNotFound) {
		return &domain.Stats{UserID: userID}, nil
	}
	return stats, err
}

func (s *progressService) addXP(ctx context.Context, userID uint64, amount int) (*domain.Stats, error) {
	stats, err := s.loadStats(ctx, userID)
	if err != nil {
		return nil, err
	}
	stats.XP += amount
	if err := s.stats.Save(ctx, stats); err != nil {
		return nil, err
	}
	return stats, nil
}

func applyStreak(stats *domain.Stats, now time.Time) {
	today := dateOnly(now)
	if stats.LastActiveDate == nil {
		stats.CurrentStreak = 1
	} else {
		last := dateOnly(*stats.LastActiveDate)
		switch {
		case last.Equal(today):
			// Already counted today.
		case last.Equal(today.AddDate(0, 0, -1)):
			stats.CurrentStreak++
		default:
			stats.CurrentStreak = 1
		}
	}
	if stats.CurrentStreak < 1 {
		stats.CurrentStreak = 1
	}
	if stats.CurrentStreak > stats.LongestStreak {
		stats.LongestStreak = stats.CurrentStreak
	}
	stats.LastActiveDate = &today
}

func firstUnlocked(lessons []domain.LessonContext, completed map[uint64]bool) *domain.LessonContext {
	seenPath := make(map[uint64]bool)
	prevCompleted := make(map[uint64]bool)
	for i := range lessons {
		lc := &lessons[i]
		unlocked := true
		if seenPath[lc.PathID] {
			unlocked = prevCompleted[lc.PathID]
		}
		if !completed[lc.ID] && unlocked {
			return lc
		}
		seenPath[lc.PathID] = true
		prevCompleted[lc.PathID] = completed[lc.ID]
	}
	return nil
}

func allCompleted(lessons []domain.LessonContext, completed map[uint64]bool) bool {
	if len(lessons) == 0 {
		return false
	}
	for _, l := range lessons {
		if !completed[l.ID] {
			return false
		}
	}
	return true
}
