package service

import (
	"math"
	"time"

	"github.com/gitlearn/backend/internal/domain"
	"github.com/gitlearn/backend/internal/dto"
)

func percent(done, total int) int {
	if total <= 0 {
		return 0
	}
	v := float64(done) / float64(total) * 100
	return int(math.Round(v))
}

func dateOnly(t time.Time) time.Time {
	u := t.UTC()
	return time.Date(u.Year(), u.Month(), u.Day(), 0, 0, 0, 0, time.UTC)
}

func datePtrString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}

func mapStats(s domain.Stats) dto.Stats {
	return dto.Stats{
		XP:             s.XP,
		CurrentStreak:  s.CurrentStreak,
		LongestStreak:  s.LongestStreak,
		LastActiveDate: datePtrString(s.LastActiveDate),
	}
}

func mapBadge(b domain.Badge) dto.Badge {
	return dto.Badge{
		Code:        b.Code,
		Name:        b.Name,
		Description: b.Description,
		EarnedAt:    b.EarnedAt,
	}
}

func mapBadges(badges []domain.Badge) []dto.Badge {
	out := make([]dto.Badge, 0, len(badges))
	for _, b := range badges {
		out = append(out, mapBadge(b))
	}
	return out
}

func progressStatus(p *domain.Progress) string {
	if p == nil || p.Status == "" {
		return domain.StatusNotStarted
	}
	return p.Status
}

func mapLessonSummary(l domain.LessonContext, p *domain.Progress, quizTotal int, locked bool) dto.LessonSummary {
	status := progressStatus(p)
	summary := dto.LessonSummary{
		ID:               l.ID,
		Slug:             l.Slug,
		Title:            l.Title,
		EstimatedMinutes: l.EstimatedMinutes,
		OrderNo:          l.OrderNo,
		Status:           status,
		QuizTotal:        quizTotal,
		Locked:           locked,
	}
	if p != nil {
		summary.PracticeDone = p.PracticeDone
		summary.QuizScore = p.QuizScore
	}
	return summary
}

func mapCheatsheet(items []domain.CheatsheetItem) []dto.CheatsheetItem {
	out := make([]dto.CheatsheetItem, 0, len(items))
	for _, item := range items {
		out = append(out, dto.CheatsheetItem{
			ID:          item.ID,
			Category:    item.Category,
			Command:     item.Command,
			Description: item.Description,
			Example:     item.Example,
		})
	}
	return out
}

func publicOptions(options []domain.QuizOption) []dto.QuizOption {
	out := make([]dto.QuizOption, 0, len(options))
	for _, o := range options {
		out = append(out, dto.QuizOption{ID: o.ID, OptionText: o.OptionText})
	}
	return out
}

func completedSet(items []domain.Progress) map[uint64]bool {
	set := make(map[uint64]bool, len(items))
	for _, p := range items {
		if p.Status == domain.StatusCompleted {
			set[p.LessonID] = true
		}
	}
	return set
}

func progressMap(items []domain.Progress) map[uint64]*domain.Progress {
	out := make(map[uint64]*domain.Progress, len(items))
	for i := range items {
		p := items[i]
		out[p.LessonID] = &p
	}
	return out
}

func quizTotalFor(total map[uint64]int, lessonID uint64) int {
	return total[lessonID]
}
