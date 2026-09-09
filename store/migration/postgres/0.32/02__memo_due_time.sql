-- Adds native reminder/due-date support. `due_time` is a unix timestamp
-- (seconds) parsed out of a memo's `!due(YYYY-MM-DD)` /
-- `!due(YYYY-MM-DD:HH:MM)` markdown token by the backend content processor
-- on every create/update (see internal/markdown). `reminder_triggered`
-- tracks whether the background reminder runner has already delivered the
-- Inbox notification for the current due_time, so edits that change the due
-- time (which reset the flag) can re-fire a reminder.
ALTER TABLE memo ADD COLUMN due_time BIGINT DEFAULT NULL;
ALTER TABLE memo ADD COLUMN reminder_triggered BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_memo_due_time ON memo(due_time) WHERE due_time IS NOT NULL;
