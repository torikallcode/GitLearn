package service

import (
	"context"
	"strings"

	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/repository"
)

// CommunityService manages lesson discussions.
type CommunityService interface {
	List(ctx context.Context, slug string) ([]dto.Comment, error)
	Create(ctx context.Context, userID uint64, slug, content string) (*dto.Comment, error)
	Delete(ctx context.Context, userID, commentID uint64) error
}

type communityService struct {
	content  repository.ContentRepository
	comments repository.CommentRepository
	users    repository.UserRepository
}

// NewCommunityService builds the community service.
func NewCommunityService(content repository.ContentRepository, comments repository.CommentRepository, users repository.UserRepository) CommunityService {
	return &communityService{content: content, comments: comments, users: users}
}

func (s *communityService) List(ctx context.Context, slug string) ([]dto.Comment, error) {
	lesson, err := s.content.GetLessonBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	items, err := s.comments.ListByLesson(ctx, lesson.ID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.Comment, 0, len(items))
	for _, c := range items {
		out = append(out, mapComment(c))
	}
	return out, nil
}

func (s *communityService) Create(ctx context.Context, userID uint64, slug, content string) (*dto.Comment, error) {
	text := strings.TrimSpace(content)
	if len(text) < 2 {
		return nil, domain.WrapValidation("content", "minimal 2 karakter")
	}
	lesson, err := s.content.GetLessonBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	comment := &domain.Comment{LessonID: lesson.ID, LessonSlug: lesson.Slug, UserID: userID, Content: text}
	if err := s.comments.Create(ctx, comment); err != nil {
		return nil, err
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	comment.UserName = user.Name
	out := mapComment(*comment)
	return &out, nil
}

func (s *communityService) Delete(ctx context.Context, userID, commentID uint64) error {
	comment, err := s.comments.Get(ctx, commentID)
	if err != nil {
		return err
	}
	if comment.UserID != userID {
		user, err := s.users.GetByID(ctx, userID)
		if err != nil {
			return err
		}
		if user.Role != domain.RoleAdmin {
			return domain.ErrForbidden
		}
	}
	return s.comments.Delete(ctx, commentID)
}

func mapComment(c domain.Comment) dto.Comment {
	return dto.Comment{
		ID:         c.ID,
		LessonID:   c.LessonID,
		LessonSlug: c.LessonSlug,
		UserID:     c.UserID,
		UserName:   c.UserName,
		Content:    c.Content,
		CreatedAt:  c.CreatedAt,
	}
}
