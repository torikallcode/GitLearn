package hash

import "golang.org/x/crypto/bcrypt"

// Password hashes a plaintext password with bcrypt's default cost.
func Password(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// Compare checks a plaintext password against a bcrypt hash.
func Compare(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
