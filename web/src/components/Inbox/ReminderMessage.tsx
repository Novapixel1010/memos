import { timestampDate } from "@bufbuild/protobuf/wkt";
import { AlarmClockIcon, CheckIcon, TrashIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import useNavigateTo from "@/hooks/useNavigateTo";
import { useArchiveNotification, useDeleteNotification } from "@/hooks/useUserQueries";
import { handleError } from "@/lib/error";
import { cn } from "@/lib/utils";
import { UserNotification, UserNotification_Status } from "@/types/proto/api/v1/user_service_pb";
import { useTranslate } from "@/utils/i18n";

interface Props {
  notification: UserNotification;
}

function ReminderMessage({ notification }: Props) {
  const t = useTranslate();
  const archiveNotification = useArchiveNotification();
  const deleteNotification = useDeleteNotification();
  const navigateTo = useNavigateTo();
  const payload = notification.payload?.case === "reminder" ? notification.payload.value : undefined;

  const handleArchiveMessage = async (silence = false) => {
    try {
      await archiveNotification.mutateAsync(notification.name);
      if (!silence) {
        toast.success(t("message.archived-successfully"));
      }
    } catch (error) {
      handleError(error, toast.error, { context: "Archive notification" });
    }
  };

  const handleDeleteMessage = async () => {
    try {
      await deleteNotification.mutateAsync(notification.name);
      toast.success(t("message.deleted-successfully"));
    } catch (error) {
      handleError(error, toast.error, { context: "Delete notification" });
    }
  };

  if (!payload) {
    return (
      <div className="w-full px-5 py-4 border-b border-border/60 last:border-b-0 bg-destructive/[0.04] group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0 ring-1 ring-destructive/20">
              <XIcon className="w-5 h-5 text-destructive" strokeWidth={2} />
            </div>
            <span className="text-sm text-destructive/80 font-medium">{t("inbox.failed-to-load")}</span>
          </div>
          <button
            onClick={handleDeleteMessage}
            className="p-1.5 hover:bg-destructive/15 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100"
            title={t("common.delete")}
          >
            <TrashIcon className="w-4 h-4 text-destructive/70 hover:text-destructive transition-colors" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  const isUnread = notification.status === UserNotification_Status.UNREAD;
  const dueDate = payload.dueTime ? timestampDate(payload.dueTime) : undefined;

  const handleNavigate = async () => {
    navigateTo(`/${payload.memo}`);
    if (isUnread) {
      await handleArchiveMessage(true);
    }
  };

  return (
    <div
      className={cn(
        "w-full px-5 py-4 border-b border-border/60 last:border-b-0 transition-all duration-200 group relative",
        isUnread ? "bg-primary/[0.03] hover:bg-primary/[0.05]" : "hover:bg-muted/30",
      )}
    >
      {isUnread && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-primary/60" />}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-1",
            isUnread ? "bg-primary/15 ring-primary/20 text-primary" : "bg-muted/80 ring-border/40 text-muted-foreground",
          )}
        >
          <AlarmClockIcon className="w-5 h-5" strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-semibold text-sm text-foreground/95">{t("inbox.reminder")}</span>
              {dueDate && (
                <span className="text-xs text-muted-foreground/60">
                  {dueDate.toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                  {dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isUnread ? (
                <button
                  onClick={() => handleArchiveMessage()}
                  className="p-1.5 hover:bg-primary/10 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100"
                  title={t("common.archive")}
                >
                  <CheckIcon className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" strokeWidth={2} />
                </button>
              ) : (
                <button
                  onClick={handleDeleteMessage}
                  className="p-1.5 hover:bg-destructive/10 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100"
                  title={t("common.delete")}
                >
                  <TrashIcon className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleNavigate}
            className="w-full p-2 text-left sm:p-3 rounded-lg bg-gradient-to-br from-primary/[0.06] to-primary/[0.03] hover:from-primary/[0.1] hover:to-primary/[0.06] cursor-pointer border border-primary/30 hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow"
          >
            <p className="text-sm text-foreground/90 line-clamp-2">
              {payload.memoSnippet || <span className="italic text-muted-foreground/50">Empty memo</span>}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReminderMessage;
