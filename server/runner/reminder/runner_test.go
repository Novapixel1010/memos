package reminder

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
	storetest "github.com/usememos/memos/store/test"
)

func createTestUser(ctx context.Context, ts *store.Store, username string) (*store.User, error) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("test_password"), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	return ts.CreateUser(ctx, &store.User{
		Username:     username,
		Role:         store.RoleUser,
		Email:        username + "@test.com",
		Nickname:     username,
		PasswordHash: string(passwordHash),
	})
}

func TestRunnerDeliversDueReminderOnce(t *testing.T) {
	ctx := context.Background()
	ts := storetest.NewTestingStore(ctx, t)
	defer ts.Close()

	user, err := createTestUser(ctx, ts, "reminder-user")
	require.NoError(t, err)

	past := time.Now().Add(-time.Hour).Unix()
	memo, err := ts.CreateMemo(ctx, &store.Memo{
		UID:        "due-memo",
		CreatorID:  user.ID,
		Content:    "renew passport !due(2020-01-01)",
		Visibility: store.Private,
		DueTime:    &past,
	})
	require.NoError(t, err)

	future := time.Now().Add(time.Hour).Unix()
	notYetDue, err := ts.CreateMemo(ctx, &store.Memo{
		UID:        "not-yet-due-memo",
		CreatorID:  user.ID,
		Content:    "future task !due(2099-01-01)",
		Visibility: store.Private,
		DueTime:    &future,
	})
	require.NoError(t, err)

	runner := NewRunner(ts)
	runner.RunOnce(ctx)

	inboxes, err := ts.ListInboxes(ctx, &store.FindInbox{ReceiverID: &user.ID})
	require.NoError(t, err)
	require.Len(t, inboxes, 1, "only the due memo should have triggered a reminder")
	require.Equal(t, storepb.InboxMessage_REMINDER, inboxes[0].Message.Type)
	require.Equal(t, memo.ID, inboxes[0].Message.GetReminder().GetMemoId())
	require.Equal(t, past, inboxes[0].Message.GetReminder().GetDueTime())
	require.Equal(t, store.UNREAD, inboxes[0].Status)

	updated, err := ts.GetMemo(ctx, &store.FindMemo{ID: &memo.ID})
	require.NoError(t, err)
	require.True(t, updated.ReminderTriggered)

	stillPending, err := ts.GetMemo(ctx, &store.FindMemo{ID: &notYetDue.ID})
	require.NoError(t, err)
	require.False(t, stillPending.ReminderTriggered)

	// A second run must not deliver a duplicate reminder for the same memo.
	runner.RunOnce(ctx)
	inboxes, err = ts.ListInboxes(ctx, &store.FindInbox{ReceiverID: &user.ID})
	require.NoError(t, err)
	require.Len(t, inboxes, 1, "an already-triggered reminder must not fire again")
}

func TestRunnerSkipsArchivedMemos(t *testing.T) {
	ctx := context.Background()
	ts := storetest.NewTestingStore(ctx, t)
	defer ts.Close()

	user, err := createTestUser(ctx, ts, "archived-user")
	require.NoError(t, err)

	past := time.Now().Add(-time.Hour).Unix()
	memo, err := ts.CreateMemo(ctx, &store.Memo{
		UID:        "archived-due-memo",
		CreatorID:  user.ID,
		Content:    "old reminder !due(2020-01-01)",
		Visibility: store.Private,
		DueTime:    &past,
	})
	require.NoError(t, err)

	archived := store.Archived
	require.NoError(t, ts.UpdateMemo(ctx, &store.UpdateMemo{ID: memo.ID, RowStatus: &archived}))

	runner := NewRunner(ts)
	runner.RunOnce(ctx)

	inboxes, err := ts.ListInboxes(ctx, &store.FindInbox{ReceiverID: &user.ID})
	require.NoError(t, err)
	require.Empty(t, inboxes, "an archived memo's reminder must not fire")
}
