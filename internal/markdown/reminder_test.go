package markdown

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestExtractDueTime(t *testing.T) {
	tests := []struct {
		name    string
		content string
		wantOk  bool
		want    time.Time
	}{
		{
			name:    "no due token",
			content: "Just a regular memo with no reminder.",
			wantOk:  false,
		},
		{
			name:    "date only defaults to end of day UTC",
			content: "Renew passport !due(2026-03-15)",
			wantOk:  true,
			want:    time.Date(2026, 3, 15, 23, 59, 59, 0, time.UTC),
		},
		{
			name:    "date and time",
			content: "Standup !due(2026-03-15:09:30)",
			wantOk:  true,
			want:    time.Date(2026, 3, 15, 9, 30, 0, 0, time.UTC),
		},
		{
			name:    "midnight time explicit",
			content: "!due(2026-01-01:00:00)",
			wantOk:  true,
			want:    time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			name:    "invalid calendar date is rejected",
			content: "!due(2024-02-30)",
			wantOk:  false,
		},
		{
			name:    "invalid month is rejected",
			content: "!due(2024-13-01)",
			wantOk:  false,
		},
		{
			name:    "invalid hour is rejected",
			content: "!due(2026-03-15:24:00)",
			wantOk:  false,
		},
		{
			name:    "invalid minute is rejected",
			content: "!due(2026-03-15:10:60)",
			wantOk:  false,
		},
		{
			name:    "malformed token is ignored",
			content: "!due(not-a-date)",
			wantOk:  false,
		},
		{
			name:    "first valid token wins when multiple present",
			content: "!due(2024-02-30) then !due(2026-03-15)",
			wantOk:  true,
			want:    time.Date(2026, 3, 15, 23, 59, 59, 0, time.UTC),
		},
		{
			name:    "leap day is valid",
			content: "!due(2024-02-29)",
			wantOk:  true,
			want:    time.Date(2024, 2, 29, 23, 59, 59, 0, time.UTC),
		},
		{
			name:    "token embedded mid-sentence",
			content: "Please finish this !due(2026-06-01:18:00) before the meeting.",
			wantOk:  true,
			want:    time.Date(2026, 6, 1, 18, 0, 0, 0, time.UTC),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := ExtractDueTime([]byte(tt.content))
			assert.Equal(t, tt.wantOk, ok)
			if tt.wantOk {
				assert.Equal(t, tt.want.Unix(), got)
			}
		})
	}
}
