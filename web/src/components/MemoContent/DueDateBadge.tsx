import type { Element } from "hast";
import { AlarmClockIcon, CalendarClockIcon, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";

interface DueDateBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  node?: Element; // AST node from react-markdown
  "data-due-date"?: string;
  "data-has-time"?: string;
  children?: React.ReactNode;
}

const REFRESH_INTERVAL_MS = 60_000;

type DueStatus = "overdue" | "due-today" | "upcoming";

function isSameCalendarDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function statusOf(dueDate: Date, now: Date): DueStatus {
  if (dueDate.getTime() < now.getTime()) return "overdue";
  if (isSameCalendarDay(dueDate, now)) return "due-today";
  return "upcoming";
}

export const DueDateBadge: React.FC<DueDateBadgeProps> = ({
  "data-due-date": dataDueDate,
  "data-has-time": dataHasTime,
  className,
  style,
  node: _node,
  children,
  ...props
}) => {
  const t = useTranslate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const dueDate = dataDueDate ? new Date(dataDueDate) : undefined;
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return (
      <span className={className} style={style} {...props}>
        {children}
      </span>
    );
  }

  const status = statusOf(dueDate, now);
  const label = status === "overdue" ? t("reminder.overdue") : status === "due-today" ? t("reminder.due-today") : t("reminder.upcoming");
  const Icon = status === "overdue" ? AlarmClockIcon : status === "due-today" ? CalendarClockIcon : CalendarIcon;
  const variant = status === "overdue" ? "destructive" : status === "due-today" ? "warning" : "outline";

  const dateText = dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeText = dataHasTime === "true" ? dueDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : undefined;

  return (
    <Badge
      variant={variant}
      shape="pill"
      title={dueDate.toLocaleString()}
      className={cn("cursor-default align-middle", className)}
      style={style}
      data-due-date={dataDueDate}
      {...props}
    >
      <Icon className="size-3" />
      <span>{label}</span>
      <span className="opacity-80">
        {dateText}
        {timeText ? ` · ${timeText}` : ""}
      </span>
    </Badge>
  );
};
