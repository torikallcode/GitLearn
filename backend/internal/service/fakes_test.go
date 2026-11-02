package service

import (
	"context"
	"strings"
	"time"

	"github.com/gitlearn/backend/internal/domain"
)

// ---- fake content repository -------------------------------------------------

type fakeContent struct {
	paths    []domain.Path
	bySlug   map[string]*domain.Path
	modules  map[uint64][]domain.Module
	lessons  map[uint64][]domain.LessonContext
	byLesson map[string]*domain.LessonContext
	cheat    []domain.CheatsheetItem
}

func newFakeContent(lessons ...domain.LessonContext) *fakeContent {
	f := &fakeContent{
		bySlug:   make(map[string]*domain.Path),
		modules:  make(map[uint64][]domain.Module),
		lessons:  make(map[uint64][]domain.LessonContext),
		byLesson: make(map[string]*domain.LessonContext),
	}
	pathSeen := make(map[uint64]bool)
	moduleSeen := make(map[uint64]bool)
	for _, lesson := range lessons {
		if !pathSeen[lesson.PathID] {
			pathSeen[lesson.PathID] = true
			f.paths = append(f.paths, domain.Path{
				ID:      lesson.PathID,
				Slug:    lesson.PathSlug,
				Title:   lesson.PathTitle,
				OrderNo: lesson.PathOrderNo,
				Track:   lesson.PathTrack,
			})
		}
		if !moduleSeen[lesson.ModuleID] {
			moduleSeen[lesson.ModuleID] = true
			f.modules[lesson.PathID] = append(f.modules[lesson.PathID], domain.Module{
				ID:      lesson.ModuleID,
				PathID:  lesson.PathID,
				Title:   lesson.ModuleTitle,
				OrderNo: lesson.ModuleOrderNo,
			})
		}
		cp := lesson
		f.lessons[lesson.PathID] = append(f.lessons[lesson.PathID], cp)
		f.byLesson[lesson.Slug] = &cp
	}
	for i := range f.paths {
		p := f.paths[i]
		f.bySlug[p.Slug] = &p
	}
	return f
}

func (f *fakeContent) ListPaths(context.Context) ([]domain.Path, error) {
	return append([]domain.Path(nil), f.paths...), nil
}

func (f *fakeContent) GetPathBySlug(_ context.Context, slug string) (*domain.Path, error) {
	p, ok := f.bySlug[slug]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *p
	return &cp, nil
}

func (f *fakeContent) GetPathByID(_ context.Context, id uint64) (*domain.Path, error) {
	for _, p := range f.paths {
		if p.ID == id {
			cp := p
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (f *fakeContent) ListModulesByPath(_ context.Context, pathID uint64) ([]domain.Module, error) {
	return append([]domain.Module(nil), f.modules[pathID]...), nil
}

func (f *fakeContent) GetModuleByID(_ context.Context, id uint64) (*domain.Module, error) {
	for _, mods := range f.modules {
		for _, m := range mods {
			if m.ID == id {
				cp := m
				return &cp, nil
			}
		}
	}
	return nil, domain.ErrNotFound
}

func (f *fakeContent) GetLessonBySlug(_ context.Context, slug string) (*domain.Lesson, error) {
	lc, ok := f.byLesson[slug]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := lc.Lesson
	return &cp, nil
}

func (f *fakeContent) GetLessonContextBySlug(_ context.Context, slug string) (*domain.LessonContext, error) {
	lc, ok := f.byLesson[slug]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *lc
	return &cp, nil
}

func (f *fakeContent) ListLessonContextsByPath(_ context.Context, pathID uint64) ([]domain.LessonContext, error) {
	return append([]domain.LessonContext(nil), f.lessons[pathID]...), nil
}

func (f *fakeContent) ListPublishedLessonContexts(context.Context) ([]domain.LessonContext, error) {
	out := make([]domain.LessonContext, 0)
	for _, p := range f.paths {
		out = append(out, f.lessons[p.ID]...)
	}
	return out, nil
}

func (f *fakeContent) SearchLessons(_ context.Context, query string, limit int) ([]domain.SearchLesson, error) {
	q := strings.ToLower(query)
	out := make([]domain.SearchLesson, 0)
	for _, p := range f.paths {
		for _, l := range f.lessons[p.ID] {
			if strings.Contains(strings.ToLower(l.Title), q) || strings.Contains(strings.ToLower(l.ContentMD), q) {
				out = append(out, domain.SearchLesson{Slug: l.Slug, Title: l.Title, PathTitle: l.PathTitle, ModuleTitle: l.ModuleTitle})
				if len(out) >= limit {
					return out, nil
				}
			}
		}
	}
	return out, nil
}

func (f *fakeContent) ListCheatsheet(_ context.Context, query string) ([]domain.CheatsheetItem, error) {
	q := strings.ToLower(strings.TrimSpace(query))
	out := make([]domain.CheatsheetItem, 0, len(f.cheat))
	for _, item := range f.cheat {
		if q == "" || strings.Contains(strings.ToLower(item.Command), q) || strings.Contains(strings.ToLower(item.Description), q) {
			out = append(out, item)
		}
	}
	return out, nil
}

func (f *fakeContent) SearchCheatsheet(_ context.Context, query string, limit int) ([]domain.CheatsheetItem, error) {
	items, _ := f.ListCheatsheet(context.Background(), query)
	if len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

// ---- fake quiz repository ----------------------------------------------------

type fakeQuiz struct {
	quizzes map[uint64]domain.Quiz
	options map[uint64][]domain.QuizOption
}

func newFakeQuiz() *fakeQuiz {
	return &fakeQuiz{quizzes: make(map[uint64]domain.Quiz), options: make(map[uint64][]domain.QuizOption)}
}

func (f *fakeQuiz) add(q domain.Quiz, options ...domain.QuizOption) {
	f.quizzes[q.ID] = q
	f.options[q.ID] = options
}

func (f *fakeQuiz) ListByLesson(_ context.Context, lessonID uint64) ([]domain.Quiz, error) {
	out := make([]domain.Quiz, 0)
	for _, q := range f.quizzes {
		if q.LessonID == lessonID {
			q.Options = append([]domain.QuizOption(nil), f.options[q.ID]...)
			out = append(out, q)
		}
	}
	return out, nil
}

func (f *fakeQuiz) GetByID(_ context.Context, id uint64) (*domain.Quiz, error) {
	q, ok := f.quizzes[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return &q, nil
}

func (f *fakeQuiz) GetWithLesson(_ context.Context, id uint64) (*domain.Quiz, error) {
	q, ok := f.quizzes[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return &q, nil
}

func (f *fakeQuiz) GetOptionsByQuizID(_ context.Context, quizID uint64) ([]domain.QuizOption, error) {
	return append([]domain.QuizOption(nil), f.options[quizID]...), nil
}

func (f *fakeQuiz) GetOption(_ context.Context, quizID, optionID uint64) (*domain.QuizOption, error) {
	for _, o := range f.options[quizID] {
		if o.ID == optionID {
			cp := o
			return &cp, nil
		}
	}
	return nil, domain.ErrInvalidOption
}

func (f *fakeQuiz) CountByLesson(_ context.Context, lessonID uint64) (int, error) {
	count := 0
	for _, q := range f.quizzes {
		if q.LessonID == lessonID {
			count++
		}
	}
	return count, nil
}

func (f *fakeQuiz) CountByLessonIDs(_ context.Context, ids []uint64) (map[uint64]int, error) {
	out := make(map[uint64]int, len(ids))
	for _, id := range ids {
		out[id], _ = f.CountByLesson(context.Background(), id)
	}
	return out, nil
}

// ---- fake progress repository ------------------------------------------------

type fakeProgress struct {
	items  map[[2]uint64]*domain.Progress
	nextID uint64
}

func newFakeProgress() *fakeProgress {
	return &fakeProgress{items: make(map[[2]uint64]*domain.Progress)}
}

func (f *fakeProgress) Get(_ context.Context, userID, lessonID uint64) (*domain.Progress, error) {
	p, ok := f.items[[2]uint64{userID, lessonID}]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *p
	return &cp, nil
}

func (f *fakeProgress) ListByUser(_ context.Context, userID uint64) ([]domain.Progress, error) {
	out := make([]domain.Progress, 0)
	for key, p := range f.items {
		if key[0] == userID {
			out = append(out, *p)
		}
	}
	return out, nil
}

func (f *fakeProgress) Save(_ context.Context, p *domain.Progress) error {
	if p == nil {
		return nil
	}
	key := [2]uint64{p.UserID, p.LessonID}
	cp := *p
	if cp.ID == 0 {
		f.nextID++
		cp.ID = f.nextID
	}
	f.items[key] = &cp
	p.ID = cp.ID
	return nil
}

// ---- fake attempt repository -------------------------------------------------

type fakeAttempts struct {
	attempts     []domain.QuizAttempt
	lessonByQuiz map[uint64]uint64
	nextID       uint64
}

func newFakeAttempts() *fakeAttempts {
	return &fakeAttempts{lessonByQuiz: make(map[uint64]uint64)}
}

func (f *fakeAttempts) Create(_ context.Context, a *domain.QuizAttempt) error {
	f.nextID++
	a.ID = f.nextID
	f.attempts = append(f.attempts, *a)
	return nil
}

func (f *fakeAttempts) CountDistinctCorrectByLesson(_ context.Context, userID, lessonID uint64) (int, error) {
	seen := make(map[uint64]bool)
	for _, a := range f.attempts {
		if a.UserID == userID && a.IsCorrect && f.lessonByQuiz[a.QuizID] == lessonID {
			seen[a.QuizID] = true
		}
	}
	return len(seen), nil
}

func (f *fakeAttempts) CountDistinctAnsweredByLesson(_ context.Context, userID, lessonID uint64) (int, error) {
	seen := make(map[uint64]bool)
	for _, a := range f.attempts {
		if a.UserID == userID && f.lessonByQuiz[a.QuizID] == lessonID {
			seen[a.QuizID] = true
		}
	}
	return len(seen), nil
}

// ---- fake stats repository ---------------------------------------------------

type fakeStats struct {
	items map[uint64]*domain.Stats
}

func newFakeStats() *fakeStats { return &fakeStats{items: make(map[uint64]*domain.Stats)} }

func (f *fakeStats) Get(_ context.Context, userID uint64) (*domain.Stats, error) {
	s, ok := f.items[userID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *s
	if s.LastActiveDate != nil {
		d := *s.LastActiveDate
		cp.LastActiveDate = &d
	}
	return &cp, nil
}

func (f *fakeStats) Save(_ context.Context, s *domain.Stats) error {
	cp := *s
	if s.LastActiveDate != nil {
		d := *s.LastActiveDate
		cp.LastActiveDate = &d
	}
	f.items[s.UserID] = &cp
	return nil
}

// ---- fake badge repository ---------------------------------------------------

type fakeBadges struct {
	defs   []domain.Badge
	byUser map[uint64][]domain.Badge
}

func newFakeBadges(defs ...domain.Badge) *fakeBadges {
	return &fakeBadges{defs: defs, byUser: make(map[uint64][]domain.Badge)}
}

func (f *fakeBadges) ListDefinitions(context.Context) ([]domain.Badge, error) {
	return append([]domain.Badge(nil), f.defs...), nil
}

func (f *fakeBadges) ListByUser(_ context.Context, userID uint64) ([]domain.Badge, error) {
	return append([]domain.Badge(nil), f.byUser[userID]...), nil
}

func (f *fakeBadges) Award(_ context.Context, userID, badgeID uint64, earnedAt time.Time) error {
	for _, def := range f.defs {
		if def.ID != badgeID {
			continue
		}
		for _, b := range f.byUser[userID] {
			if b.ID == badgeID {
				return nil
			}
		}
		def.EarnedAt = &earnedAt
		f.byUser[userID] = append(f.byUser[userID], def)
		return nil
	}
	return domain.ErrNotFound
}

// ---- fake user repository ----------------------------------------------------

type fakeUsers struct {
	byID    map[uint64]*domain.User
	byEmail map[string]*domain.User
	nextID  uint64
}

func newFakeUsers() *fakeUsers {
	return &fakeUsers{byID: make(map[uint64]*domain.User), byEmail: make(map[string]*domain.User)}
}

func (f *fakeUsers) Create(_ context.Context, u *domain.User) error {
	if _, exists := f.byEmail[u.Email]; exists {
		return domain.ErrEmailTaken
	}
	f.nextID++
	cp := *u
	cp.ID = f.nextID
	cp.CreatedAt = time.Now().UTC()
	u.ID = cp.ID
	u.CreatedAt = cp.CreatedAt
	f.byID[cp.ID] = &cp
	f.byEmail[cp.Email] = &cp
	return nil
}

func (f *fakeUsers) GetByID(_ context.Context, id uint64) (*domain.User, error) {
	u, ok := f.byID[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *u
	return &cp, nil
}

func (f *fakeUsers) GetByEmail(_ context.Context, email string) (*domain.User, error) {
	u, ok := f.byEmail[email]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *u
	return &cp, nil
}

func (f *fakeUsers) Update(_ context.Context, u *domain.User) error {
	cp := *u
	old := f.byID[u.ID]
	if old == nil {
		return domain.ErrNotFound
	}
	delete(f.byEmail, old.Email)
	f.byID[u.ID] = &cp
	f.byEmail[u.Email] = &cp
	return nil
}

// ---- fake review repository --------------------------------------------------

type fakeReviews struct {
	items  map[uint64]*domain.ReviewItem
	nextID uint64
}

func newFakeReviews() *fakeReviews { return &fakeReviews{items: make(map[uint64]*domain.ReviewItem)} }

func (f *fakeReviews) ListDue(_ context.Context, userID uint64, now time.Time) ([]domain.ReviewItem, error) {
	out := make([]domain.ReviewItem, 0)
	for _, item := range f.items {
		if item.UserID == userID && !item.NextReviewAt.After(now) {
			out = append(out, *item)
		}
	}
	return out, nil
}

func (f *fakeReviews) GetForUser(_ context.Context, reviewID, userID uint64) (*domain.ReviewItem, error) {
	item, ok := f.items[reviewID]
	if !ok || item.UserID != userID {
		return nil, domain.ErrNotFound
	}
	cp := *item
	return &cp, nil
}

func (f *fakeReviews) Upsert(_ context.Context, item *domain.ReviewItem) error {
	for id, existing := range f.items {
		if existing.UserID == item.UserID && existing.QuizID == item.QuizID {
			cp := *item
			cp.ID = id
			f.items[id] = &cp
			item.ID = id
			return nil
		}
	}
	f.nextID++
	cp := *item
	cp.ID = f.nextID
	f.items[cp.ID] = &cp
	item.ID = cp.ID
	return nil
}

func (f *fakeReviews) UpdateSchedule(_ context.Context, reviewID, userID uint64, intervalDays int, ease float64, next time.Time) error {
	item, ok := f.items[reviewID]
	if !ok || item.UserID != userID {
		return domain.ErrNotFound
	}
	item.IntervalDays = intervalDays
	item.Ease = ease
	item.NextReviewAt = next
	return nil
}
