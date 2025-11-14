import { cn } from "../../utils";
import { formatDuration, getDurationStatus, getLogLevelIcon, getStatusCategory, getStatusIcon } from "../../utils/formatUtils";

// ============================================================================
// INLINE CHIPS
// Small, readable status indicators
// ============================================================================

interface ChipProps {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "error" | "info";
  size?: "xs" | "sm";
  className?: string;
}

export function Chip({ children, variant = "neutral", size = "xs", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono font-medium rounded",
        // Size
        size === "xs" && "px-1.5 py-0.5 text-[10px]",
        size === "sm" && "px-2 py-1 text-xs",
        // Variant - using color economy (neutral for most, strong color for critical)
        variant === "neutral" && "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
        variant === "success" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
        variant === "warning" && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
        variant === "error" && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold",
        variant === "info" && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * HTTP Method chip
 */
export function MethodChip({ method }: { method: string }) {
  const variant = method === "DELETE" ? "error" : "neutral";
  return (
    <Chip variant={variant} className="min-w-[42px] justify-center">
      {method}
    </Chip>
  );
}

/**
 * HTTP Status chip with icon
 */
export function StatusChip({ status }: { status: number | null }) {
  if (!status) {
    return <Chip variant="neutral">...</Chip>;
  }

  const category = getStatusCategory(status);
  const icon = getStatusIcon(status);
  
  let variant: ChipProps["variant"] = "neutral";
  if (category === 'server-error') variant = "error";
  else if (category === 'client-error') variant = "warning";
  else if (category === 'success') variant = "success";

  return (
    <Chip variant={variant}>
      <span>{icon}</span>
      <span>{status}</span>
    </Chip>
  );
}

/**
 * Cache status chip
 */
export function CacheChip({ status }: { status: "HIT" | "MISS" | "STALE" }) {
  const variant = status === "HIT" ? "success" : "neutral";
  return <Chip variant={variant}>cache:{status}</Chip>;
}

/**
 * Retry count chip
 */
export function RetryChip({ count }: { count: number }) {
  const variant = count > 2 ? "error" : count > 0 ? "warning" : "neutral";
  return <Chip variant={variant}>retry:{count}</Chip>;
}

/**
 * Duration chip with smart formatting and status-based coloring
 */
export function DurationChip({ duration, threshold = 1000 }: { duration: number; threshold?: number }) {
  const status = getDurationStatus(duration, { normal: threshold, slow: threshold * 2 });
  const formatted = formatDuration(duration);
  
  let variant: ChipProps["variant"] = "neutral";
  if (status === 'critical') variant = "error";
  else if (status === 'slow') variant = "warning";
  else if (status === 'fast') variant = "success";

  return <Chip variant={variant}>{formatted}</Chip>;
}

/**
 * Log level chip with icon
 */
export function LogLevelChip({ level }: { level: string }) {
  const icon = getLogLevelIcon(level);
  let variant: ChipProps["variant"] = "neutral";
  
  if (level === "error") variant = "error";
  else if (level === "warn") variant = "warning";
  else if (level === "info") variant = "info";

  return (
    <Chip variant={variant} size="sm" className="min-w-[50px] justify-center uppercase">
      <span>{icon}</span>
      <span>{level}</span>
    </Chip>
  );
}

/**
 * GraphQL operation type chip
 */
export function GraphQLChip({ operation }: { operation: "query" | "mutation" | "subscription" }) {
  const variant = operation === "mutation" ? "warning" : "neutral";
  return <Chip variant={variant}>GQL:{operation}</Chip>;
}
