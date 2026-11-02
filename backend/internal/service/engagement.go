package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/repository"
)

// EngagementService exposes gamification stats and the completion certificate.
type EngagementService interface {
	Stats(ctx context.Context, userID uint64) (*dto.StatsResponse, error)
	Certificate(ctx context.Context, userID uint64) (*dto.Certificate, error)
	PublicCertificate(ctx context.Context, code string) (*dto.Certificate, error)
}

type engagementService struct {
	content  repository.ContentRepository
	progress repository.ProgressRepository
	stats    repository.StatsRepository
	badges   repository.BadgeRepository
	users    repository.UserRepository
	now      func() time.Time
}

// NewEngagementService builds the engagement service.
func NewEngagementService(
	content repository.ContentRepository,
	progress repository.ProgressRepository,
	stats repository.StatsRepository,
	badges repository.BadgeRepository,
	users repository.UserRepository,
) EngagementService {
	return &engagementService{
		content:  content,
		progress: progress,
		stats:    stats,
		badges:   badges,
		users:    users,
		now:      time.Now,
	}
}

func (s *engagementService) Stats(ctx context.Context, userID uint64) (*dto.StatsResponse, error) {
	stats, err := s.stats.Get(ctx, userID)
	if errors.Is(err, domain.ErrNotFound) {
		stats = &domain.Stats{UserID: userID}
	} else if err != nil {
		return nil, err
	}
	badges, err := s.badges.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &dto.StatsResponse{
		Stats:  mapStats(*stats),
		Badges: mapBadges(badges),
	}, nil
}

func (s *engagementService) Certificate(ctx context.Context, userID uint64) (*dto.Certificate, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	allLessons, err := s.content.ListPublishedLessonContexts(ctx)
	if err != nil {
		return nil, err
	}
	lessons := certificateLessons(allLessons)
	items, err := s.progress.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	completed := completedSet(items)

	completedLessons := 0
	for _, lesson := range lessons {
		if completed[lesson.ID] {
			completedLessons++
		}
	}
	available := len(lessons) > 0 && completedLessons == len(lessons)
	cert := &dto.Certificate{
		Available:        available,
		Name:             user.Name,
		CompletionPct:    percent(completedLessons, len(lessons)),
		CompletedLessons: completedLessons,
		LessonsTotal:     len(lessons),
	}
	if available {
		now := s.now().UTC()
		cert.IssuedAt = &now
		cert.Code = fmt.Sprintf("GL-%d-%s", userID, now.Format("060102"))
	}
	return cert, nil
}

// PublicCertificate verifies a shared certificate code and returns the
// certificate document without requiring a session.
func (s *engagementService) PublicCertificate(ctx context.Context, code string) (*dto.Certificate, error) {
	userID, issuedAt, err := parseCertificateCode(code)
	if err != nil {
		return nil, domain.ErrNotFound
	}
	now := s.now().UTC()
	if issuedAt.After(now.Add(24 * time.Hour)) {
		return nil, domain.ErrNotFound
	}
	cert, err := s.Certificate(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !cert.Available {
		return nil, domain.ErrNotFound
	}
	cert.IssuedAt = &issuedAt
	cert.Code = fmt.Sprintf("GL-%d-%s", userID, issuedAt.Format("060102"))
	return cert, nil
}

func parseCertificateCode(code string) (uint64, time.Time, error) {
	parts := strings.Split(strings.TrimSpace(code), "-")
	if len(parts) != 3 || parts[0] != "GL" {
		return 0, time.Time{}, fmt.Errorf("invalid certificate code")
	}
	userID, err := strconv.ParseUint(parts[1], 10, 64)
	if err != nil || userID == 0 {
		return 0, time.Time{}, fmt.Errorf("invalid certificate code")
	}
	issuedAt, err := time.Parse("060102", parts[2])
	if err != nil {
		return 0, time.Time{}, fmt.Errorf("invalid certificate code")
	}
	return userID, issuedAt.UTC(), nil
}

func certificateLessons(lessons []domain.LessonContext) []domain.LessonContext {
	out := make([]domain.LessonContext, 0, len(lessons))
	for _, lesson := range lessons {
		switch lesson.PathTrack {
		case "core", "collab", "pro":
			out = append(out, lesson)
		}
	}
	return out
}
