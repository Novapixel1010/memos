// Package reminder implements the background reminder/due-date scheduler.
//
// It uses only the Go standard library (time.Ticker) to periodically scan
// for memos whose `!due(...)` reminder has come due and delivers a
// notification through the existing internal Inbox system - no external
// notification gateway or third-party scheduler is involved.
package reminder

import (
	"context"
	"log/slog"
	"time"

	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
)

// DefaultInterval is how often the runner checks for due reminders.
const DefaultInterval = time.Minute

// batchSize bounds how many due memos are processed per RunOnce iteration,
// so a large backlog of simultaneously-due reminders doesn't load every
// matching memo into memory at once.
const batchSize = 100

// Runner periodically checks for memos whose reminder has come due and
// delivers an Inbox notification for each one exactly once.
type Runner struct {
	Store    *store.Store
	Interval time.Duration

	stop chan struct{}
}

// NewRunner creates a reminder Runner using the default check interval.
func NewRunner(store *store.Store) *Runner {
	return &Runner{
		Store:    store,
		Interval: DefaultInterval,
		stop:     make(chan struct{}),
	}
}

// Run starts the periodic reminder check. It blocks until the context is
// canceled or Stop is called, so callers should invoke it in its own
// goroutine.
func (r *Runner) Run(ctx context.Context) {
	// Run once immediately so reminders that came due while the server was
	// offline fire promptly instead of waiting a full interval.
	r.RunOnce(ctx)

	ticker := time.NewTicker(r.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-r.stop:
			return
		case <-ticker.C:
			r.RunOnce(ctx)
		}
	}
}

// Stop signals a running Run call to return. Safe to call at most once.
func (r *Runner) Stop() {
	close(r.stop)
}

// RunOnce delivers a reminder notification for every NORMAL memo whose
// due_time has passed and hasn't been triggered yet.
func (r *Runner) RunOnce(ctx context.Context) {
	now := time.Now().Unix()
	notTriggered := false
	rowStatus := store.Normal

	for {
		limit := batchSize
		memos, err := r.Store.ListMemos(ctx, &store.FindMemo{
			DueBefore:         &now,
			ReminderTriggered: &notTriggered,
			RowStatus:         &rowStatus,
			ExcludeContent:    true,
			Limit:             &limit,
		})
		if err != nil {
			slog.Error("reminder runner: failed to list due memos", "err", err)
			return
		}
		if len(memos) == 0 {
			return
		}

		for _, memo := range memos {
			if err := r.deliverReminder(ctx, memo); err != nil {
				slog.Error("reminder runner: failed to deliver reminder", "err", err, "memoID", memo.ID)
			}
		}

		// Every memo in this batch is either now triggered or failed and will
		// be retried on the next tick, so a fixed-size page never repeats.
		if len(memos) < batchSize {
			return
		}
	}
}

func (r *Runner) deliverReminder(ctx context.Context, memo *store.Memo) error {
	if memo.DueTime == nil {
		// Defensive: the DueBefore filter should already exclude these.
		triggered := true
		return r.Store.UpdateMemo(ctx, &store.UpdateMemo{ID: memo.ID, ReminderTriggered: &triggered})
	}
	if _, err := r.Store.CreateInbox(ctx, &store.Inbox{
		SenderID:   memo.CreatorID,
		ReceiverID: memo.CreatorID,
		Status:     store.UNREAD,
		Message: &storepb.InboxMessage{
			Type: storepb.InboxMessage_REMINDER,
			Payload: &storepb.InboxMessage_Reminder{
				Reminder: &storepb.InboxMessage_ReminderPayload{
					MemoId:  memo.ID,
					DueTime: *memo.DueTime,
				},
			},
		},
	}); err != nil {
		return err
	}

	triggered := true
	return r.Store.UpdateMemo(ctx, &store.UpdateMemo{
		ID:                memo.ID,
		ReminderTriggered: &triggered,
	})
}
