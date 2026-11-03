package service

import (
	"testing"

	"github.com/gitlearn/backend/internal/dto"
)

func TestQuizFromRequestRequiresExactlyOneCorrectOption(t *testing.T) {
	base := dto.QuizUpsertRequest{
		Question:    "Apa itu commit?",
		Explanation: "Snapshot perubahan.",
		Options: []dto.QuizOptionInput{
			{OptionText: "Snapshot", IsCorrect: true},
			{OptionText: "Remote", IsCorrect: false},
		},
	}

	quiz, err := quizFromRequest(1, 0, base)
	if err != nil {
		t.Fatalf("expected valid quiz, got %v", err)
	}
	if len(quiz.Options) != 2 || !quiz.Options[0].IsCorrect {
		t.Fatalf("unexpected options: %+v", quiz.Options)
	}

	base.Options[1].IsCorrect = true
	if _, err := quizFromRequest(1, 0, base); err == nil {
		t.Fatal("expected error when more than one option is correct")
	}

	base.Options[0].IsCorrect = false
	base.Options[1].IsCorrect = false
	if _, err := quizFromRequest(1, 0, base); err == nil {
		t.Fatal("expected error when no option is correct")
	}
}
