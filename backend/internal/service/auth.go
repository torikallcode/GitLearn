package service

import (
	"context"
	"errors"
	"strings"

	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
	"github.com/gitlearn/backend/internal/pkg/hash"
	"github.com/gitlearn/backend/internal/pkg/jwt"
	"github.com/gitlearn/backend/internal/repository"
)

// AuthService implements registration, login, token rotation and profile edits.
type AuthService interface {
	Register(ctx context.Context, req dto.RegisterRequest) (*dto.AuthResponse, error)
	Login(ctx context.Context, req dto.LoginRequest) (*dto.AuthResponse, error)
	Refresh(ctx context.Context, refreshToken string) (*dto.RefreshResponse, error)
	Me(ctx context.Context, userID uint64) (*dto.User, error)
	UpdateProfile(ctx context.Context, userID uint64, req dto.UpdateProfileRequest) (*dto.User, error)
}

type authService struct {
	users  repository.UserRepository
	stats  repository.StatsRepository
	tokens *jwt.Manager
}

// NewAuthService builds the auth service.
func NewAuthService(users repository.UserRepository, stats repository.StatsRepository, tokens *jwt.Manager) AuthService {
	return &authService{users: users, stats: stats, tokens: tokens}
}

func (s *authService) Register(ctx context.Context, req dto.RegisterRequest) (*dto.AuthResponse, error) {
	email := normalizeEmail(req.Email)
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, domain.WrapValidation("name", "wajib diisi")
	}

	if _, err := s.users.GetByEmail(ctx, email); err == nil {
		return nil, domain.ErrEmailTaken
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	hashed, err := hash.Password(req.Password)
	if err != nil {
		return nil, err
	}
	career := req.CareerGoal
	if career != "" && career != domain.CareerFrontend && career != domain.CareerBackend {
		return nil, domain.WrapValidation("career_goal", "nilai tidak valid")
	}
	level := req.Level
	if level == "" {
		level = domain.LevelBeginner
	}

	user := &domain.User{
		Name:         name,
		Email:        email,
		PasswordHash: hashed,
		CareerGoal:   career,
		Level:        level,
	}
	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}

	stats := &domain.Stats{UserID: user.ID}
	if err := s.stats.Save(ctx, stats); err != nil {
		return nil, err
	}

	access, refresh, err := s.tokens.GeneratePair(user.ID)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		User:         dto.User{ID: user.ID, Name: user.Name, Email: user.Email, CareerGoal: user.CareerGoal, Level: user.Level, CreatedAt: user.CreatedAt, Stats: mapStats(*stats)},
		AccessToken:  access,
		RefreshToken: refresh,
	}, nil
}

func (s *authService) Login(ctx context.Context, req dto.LoginRequest) (*dto.AuthResponse, error) {
	user, err := s.users.GetByEmail(ctx, normalizeEmail(req.Email))
	if errors.Is(err, domain.ErrNotFound) {
		return nil, domain.ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}
	if !hash.Compare(user.PasswordHash, req.Password) {
		return nil, domain.ErrInvalidCredentials
	}

	access, refresh, err := s.tokens.GeneratePair(user.ID)
	if err != nil {
		return nil, err
	}
	projection, err := s.userDTO(ctx, user)
	if err != nil {
		return nil, err
	}
	return &dto.AuthResponse{
		User:         *projection,
		AccessToken:  access,
		RefreshToken: refresh,
	}, nil
}

func (s *authService) Refresh(ctx context.Context, refreshToken string) (*dto.RefreshResponse, error) {
	userID, err := s.tokens.ParseRefresh(refreshToken)
	if err != nil {
		return nil, domain.ErrInvalidToken
	}
	if _, err := s.users.GetByID(ctx, userID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrInvalidToken
		}
		return nil, err
	}
	access, refresh, err := s.tokens.GeneratePair(userID)
	if err != nil {
		return nil, err
	}
	return &dto.RefreshResponse{AccessToken: access, RefreshToken: refresh}, nil
}

func (s *authService) Me(ctx context.Context, userID uint64) (*dto.User, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.userDTO(ctx, user)
}

func (s *authService) UpdateProfile(ctx context.Context, userID uint64, req dto.UpdateProfileRequest) (*dto.User, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, domain.WrapValidation("name", "wajib diisi")
		}
		user.Name = name
	}
	if req.CareerGoal != nil {
		goal := *req.CareerGoal
		if goal != "" && goal != domain.CareerFrontend && goal != domain.CareerBackend {
			return nil, domain.WrapValidation("career_goal", "nilai tidak valid")
		}
		user.CareerGoal = goal
	}
	if req.Level != nil {
		level := *req.Level
		if level != domain.LevelBeginner && level != domain.LevelIntermediate && level != domain.LevelAdvanced {
			return nil, domain.WrapValidation("level", "nilai tidak valid")
		}
		user.Level = level
	}

	if err := s.users.Update(ctx, user); err != nil {
		return nil, err
	}
	return s.userDTO(ctx, user)
}

func (s *authService) userDTO(ctx context.Context, user *domain.User) (*dto.User, error) {
	stats, err := s.stats.Get(ctx, user.ID)
	if errors.Is(err, domain.ErrNotFound) {
		stats = &domain.Stats{UserID: user.ID}
	} else if err != nil {
		return nil, err
	}
	return &dto.User{
		ID:         user.ID,
		Name:       user.Name,
		Email:      user.Email,
		CareerGoal: user.CareerGoal,
		Level:      user.Level,
		CreatedAt:  user.CreatedAt,
		Stats:      mapStats(*stats),
	}, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
