package jwt

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	TokenAccess  = "access"
	TokenRefresh = "refresh"
	issuer       = "gitlearn"
)

// Claims is the JWT payload.
type Claims struct {
	UserID uint64 `json:"uid"`
	Type   string `json:"typ"`
	jwt.RegisteredClaims
}

// Manager issues and verifies HS256 tokens.
type Manager struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
	now        func() time.Time
}

// NewManager builds a token manager.
func NewManager(secret string, accessTTL, refreshTTL time.Duration) *Manager {
	return &Manager{
		secret:     []byte(secret),
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
		now:        time.Now,
	}
}

// GeneratePair returns a fresh access/refresh token pair.
func (m *Manager) GeneratePair(userID uint64) (string, string, error) {
	access, err := m.generate(userID, TokenAccess, m.accessTTL)
	if err != nil {
		return "", "", err
	}
	refresh, err := m.generate(userID, TokenRefresh, m.refreshTTL)
	if err != nil {
		return "", "", err
	}
	return access, refresh, nil
}

func (m *Manager) generate(userID uint64, tokenType string, ttl time.Duration) (string, error) {
	now := m.now()
	claims := &Claims{
		UserID: userID,
		Type:   tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   strconv.FormatUint(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
}

// ParseAccess verifies an access token and returns its user id.
func (m *Manager) ParseAccess(token string) (uint64, error) {
	return m.parse(token, TokenAccess)
}

// ParseRefresh verifies a refresh token and returns its user id.
func (m *Manager) ParseRefresh(token string) (uint64, error) {
	return m.parse(token, TokenRefresh)
}

func (m *Manager) parse(token, expectedType string) (uint64, error) {
	claims := &Claims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return m.secret, nil
	}, jwt.WithIssuer(issuer), jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil || !parsed.Valid {
		return 0, errors.New("invalid token")
	}
	if claims.Type != expectedType {
		return 0, errors.New("unexpected token type")
	}
	if claims.UserID == 0 {
		return 0, errors.New("missing user id")
	}
	return claims.UserID, nil
}
