package middleware

import (
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/pkg/response"
)

type rateWindow struct {
	start time.Time
	count int
}

type rateLimiter struct {
	mu      sync.Mutex
	limit   int
	entries map[string]*rateWindow
	now     func() time.Time
}

// RateLimit applies an in-memory fixed-window limit per client IP. A limit of
// zero or less disables limiting.
func RateLimit(perMinute int) gin.HandlerFunc {
	if perMinute <= 0 {
		return func(c *gin.Context) { c.Next() }
	}
	limiter := &rateLimiter{
		limit:   perMinute,
		entries: make(map[string]*rateWindow),
		now:     time.Now,
	}
	return limiter.handle
}

func (l *rateLimiter) handle(c *gin.Context) {
	now := l.now()
	windowStart := now.Truncate(time.Minute)
	key := c.ClientIP()

	l.mu.Lock()
	if len(l.entries) > 10000 {
		for ip, entry := range l.entries {
			if entry.start.Before(windowStart) {
				delete(l.entries, ip)
			}
		}
	}
	entry, ok := l.entries[key]
	if !ok || !entry.start.Equal(windowStart) {
		entry = &rateWindow{start: windowStart}
		l.entries[key] = entry
	}
	entry.count++
	count := entry.count
	l.mu.Unlock()

	if count > l.limit {
		c.Header("Retry-After", strconv.Itoa(int(time.Until(windowStart.Add(time.Minute)).Seconds())+1))
		response.Abort(c, 429, "Terlalu banyak permintaan, coba lagi nanti", "RATE_LIMITED")
		return
	}
	c.Next()
}
