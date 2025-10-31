import { cn } from "src/utils";

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
        "inline-flex items-center font-mono font-medium rounded",
        // Size
        size === "xs" && "px-1.5 py-0.5 text-[10px]",
        size === "sm" && "px-2 py-1 text-xs",
        // Variant - using color economy (neutral for most, strong color for critical)
        variant === "neutral" && "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
        variant === "success" && "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
        variant === "warning" && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
        variant === "error" && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold",
        variant === "info" && "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
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
 * HTTP Status chip
 */
export function StatusChip({ status }: { status: number | null }) {
  if (!status) {
    return <Chip variant="neutral">...</Chip>;
  }

  let variant: ChipProps["variant"] = "neutral";
  if (status >= 500) variant = "error";
  else if (status >= 400) variant = "warning";
  else if (status >= 200 && status < 300) variant = "success";

  return <Chip variant={variant}>{status}</Chip>;
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
 * Duration chip
 */
export function DurationChip({ duration, threshold = 1000 }: { duration: number; threshold?: number }) {
  let variant: ChipProps["variant"] = "neutral";
  if (duration > threshold * 2) variant = "error";
  else if (duration > threshold) variant = "warning";

  return <Chip variant={variant}>{duration}ms</Chip>;
}

/**
 * Log level chip
 */
export function LogLevelChip({ level }: { level: string }) {
  let variant: ChipProps["variant"] = "neutral";
  if (level === "error") variant = "error";
  else if (level === "warn") variant = "warning";
  else if (level === "info") variant = "info";

  return (
    <Chip variant={variant} size="sm" className="min-w-[50px] justify-center uppercase">
      {level}
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
