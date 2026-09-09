package markdown

import (
	"regexp"
	"strconv"
	"time"
)

// dueTimeRegexp matches a reminder/due-date token:
//   - Date only:    !due(YYYY-MM-DD)
//   - Date & time:  !due(YYYY-MM-DD:HH:MM)
var dueTimeRegexp = regexp.MustCompile(`!due\((\d{4})-(\d{2})-(\d{2})(?::(\d{2}):(\d{2}))?\)`)

// ExtractDueTime scans content for the first `!due(...)` reminder token and
// returns its due time as a unix timestamp (seconds, UTC).
//
// A date-only token (`!due(YYYY-MM-DD)`) defaults to the end of that day
// (23:59:59 UTC). A date-and-time token (`!due(YYYY-MM-DD:HH:MM)`) is used
// exactly as given, interpreted in UTC.
//
// ok is false when content has no `!due(...)` token, or every occurrence
// fails to name a real calendar date/time (e.g. `!due(2024-02-30)`); in that
// case a later, otherwise-valid token is still tried.
func ExtractDueTime(content []byte) (dueTime int64, ok bool) {
	for _, match := range dueTimeRegexp.FindAllSubmatch(content, -1) {
		if t, valid := parseDueTimeMatch(match); valid {
			return t.Unix(), true
		}
	}
	return 0, false
}

func parseDueTimeMatch(match [][]byte) (time.Time, bool) {
	year, err := strconv.Atoi(string(match[1]))
	if err != nil {
		return time.Time{}, false
	}
	month, err := strconv.Atoi(string(match[2]))
	if err != nil {
		return time.Time{}, false
	}
	day, err := strconv.Atoi(string(match[3]))
	if err != nil {
		return time.Time{}, false
	}

	hour, minute := 23, 59
	hasTime := len(match[4]) > 0 && len(match[5]) > 0
	second := 59
	if hasTime {
		hour, err = strconv.Atoi(string(match[4]))
		if err != nil {
			return time.Time{}, false
		}
		minute, err = strconv.Atoi(string(match[5]))
		if err != nil {
			return time.Time{}, false
		}
		second = 0
	}

	t := time.Date(year, time.Month(month), day, hour, minute, second, 0, time.UTC)
	// time.Date normalizes out-of-range components (e.g. day 30 in February)
	// instead of failing, so a round-trip mismatch indicates an invalid date.
	if t.Year() != year || int(t.Month()) != month || t.Day() != day || t.Hour() != hour || t.Minute() != minute {
		return time.Time{}, false
	}
	return t, true
}
