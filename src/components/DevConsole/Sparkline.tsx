import { useMemo } from "react";

// ============================================================================
// SPARKLINE
// Tiny inline chart for showing trends
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  showDots?: boolean;
  min?: number;
  max?: number;
}

export function Sparkline({
  data,
  width = 60,
  height = 20,
  color = "currentColor",
  fillColor,
  showDots = false,
  min,
  max,
}: SparklineProps) {
  const { points, path, area } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], path: "", area: "" };
    }

    const minValue = min ?? Math.min(...data);
    const maxValue = max ?? Math.max(...data);
    const range = maxValue - minValue || 1;

    const stepX = width / (data.length - 1 || 1);

    const points = data.map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - minValue) / range) * height;
      return { x, y, value };
    });

    // Create SVG path
    const pathData = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    // Create area fill path
    const areaData =
      pathData +
      ` L ${width} ${height} L 0 ${height} Z`;

    return { points, path: pathData, area: areaData };
  }, [data, width, height, min, max]);

  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className="inline-block">
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.2"
          strokeDasharray="2,2"
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className="inline-block"
      style={{ overflow: "visible" }}
    >
      {/* Area fill */}
      {fillColor && (
        <path
          d={area}
          fill={fillColor}
          opacity="0.2"
        />
      )}

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {showDots &&
        points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="1.5"
            fill={color}
          />
        ))}
    </svg>
  );
}

/**
 * Status-based sparkline (error = red, warning = yellow, success = green)
 */
export function StatusSparkline({
  data,
  width = 60,
  height = 20,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  const hasErrors = data.some((status) => status >= 500);
  const hasWarnings = data.some((status) => status >= 400 && status < 500);

  let color = "rgb(107, 114, 128)"; // gray
  if (hasErrors) {
    color = "rgb(239, 68, 68)"; // red
  } else if (hasWarnings) {
    color = "rgb(251, 191, 36)"; // yellow
  }

  return <Sparkline data={data} width={width} height={height} color={color} />;
}

/**
 * Duration sparkline (slow = red, medium = yellow, fast = green)
 */
export function DurationSparkline({
  data,
  width = 60,
  height = 20,
  threshold = 1000,
}: {
  data: number[];
  width?: number;
  height?: number;
  threshold?: number;
}) {
  const hasSlow = data.some((dur) => dur > threshold * 2);
  const hasMedium = data.some((dur) => dur > threshold && dur <= threshold * 2);

  let color = "rgb(34, 197, 94)"; // green
  if (hasSlow) {
    color = "rgb(239, 68, 68)"; // red
  } else if (hasMedium) {
    color = "rgb(251, 191, 36)"; // yellow
  }

  return <Sparkline data={data} width={width} height={height} color={color} />;
}
