package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	mysqlDriver "github.com/go-sql-driver/mysql"
	"github.com/gitlearn/backend/internal/domain"
)

type userRepository struct {
	db *sql.DB
}

// NewUserRepository builds a MySQL user repository.
func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO users (name, email, password_hash, career_goal, level) VALUES (?, ?, ?, ?, ?)`,
		user.Name, user.Email, user.PasswordHash, user.CareerGoal, user.Level,
	)
	if err != nil {
		if isDuplicate(err) {
			return domain.ErrEmailTaken
		}
		return err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	user.ID = uint64(id)
	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now
	return nil
}

func (r *userRepository) GetByID(ctx context.Context, id uint64) (*domain.User, error) {
	return scanUser(r.db.QueryRowContext(ctx,
		`SELECT id, name, email, password_hash, career_goal, level, created_at, updated_at FROM users WHERE id = ?`, id))
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	return scanUser(r.db.QueryRowContext(ctx,
		`SELECT id, name, email, password_hash, career_goal, level, created_at, updated_at FROM users WHERE email = ?`, email))
}

func (r *userRepository) Update(ctx context.Context, user *domain.User) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET name = ?, career_goal = ?, level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		user.Name, user.CareerGoal, user.Level, user.ID,
	)
	if err != nil {
		return err
	}
	user.UpdatedAt = time.Now().UTC()
	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (*domain.User, error) {
	var u domain.User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.CareerGoal, &u.Level, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func isDuplicate(err error) bool {
	var myErr *mysqlDriver.MySQLError
	return errors.As(err, &myErr) && myErr.Number == 1062
}
