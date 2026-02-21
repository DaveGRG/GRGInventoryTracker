import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "danger" | "neutral" | "info";

const statusStyles: Record<StatusType, string> = {
  success: "bg-emerald-600 dark:bg-emerald-600 text-white border-transparent",
  warning: "bg-amber-500 dark:bg-amber-500 text-white border-transparent",
  danger: "bg-red-600 dark:bg-red-600 text-white border-transparent",
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-600 dark:bg-blue-600 text-white border-transparent",
};

const itemStatusMap: Record<string, StatusType> = {
  Active: "success",
  Discontinuing: "warning",
  Discontinued: "danger",
};

const projectStatusMap: Record<string, StatusType> = {
  Pending: "neutral",
  Active: "success",
  Complete: "neutral",
  "On Hold": "warning",
};

const transferStatusMap: Record<string, StatusType> = {
  Requested: "info",
  "In Transit": "warning",
  Received: "success",
  Cancelled: "danger",
};

const allocationStatusMap: Record<string, StatusType> = {
  Pending: "info",
  Pulled: "info",
  Cancelled: "danger",
};

const pickListStatusMap: Record<string, StatusType> = {
  Pending: "info",
  "In Progress": "warning",
  Completed: "success",
  Cancelled: "danger",
};

interface StatusBadgeProps {
  status: string;
  type?: "item" | "project" | "transfer" | "allocation" | "pickList";
  className?: string;
}

export function StatusBadge({ status, type = "item", className }: StatusBadgeProps) {
  if (type === "item" && status === "Active") return null;

  const map = type === "project" ? projectStatusMap
    : type === "transfer" ? transferStatusMap
    : type === "allocation" ? allocationStatusMap
    : type === "pickList" ? pickListStatusMap
    : itemStatusMap;

  const statusType = map[status] || "neutral";

  return (
    <Badge
      variant="default"
      className={cn("no-default-hover-elevate no-default-active-elevate text-[11px]", statusStyles[statusType], className)}
      data-testid={`badge-status-${status.toLowerCase().replace(/\s/g, "-")}`}
    >
      {status}
    </Badge>
  );
}

export function ParIndicator({ current, par }: { current: number; par: number }) {
  if (par === 0) return <span className="text-xs text-muted-foreground">--</span>;
  const deficit = par - current;
  if (deficit <= 0) {
    return <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400" data-testid="text-par-ok">In Stock</span>;
  }
  return (
    <span className="text-xs font-medium text-red-600 dark:text-red-400" data-testid="text-par-below">
      -{deficit} Below
    </span>
  );
}
