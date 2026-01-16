import Svg, { Path, Rect } from "react-native-svg";

interface BatterySvgProps {
  percent: number; // 0-100
  size?: number;
  color?: string;
  charging?: boolean;
}

export default function BatterySvg({
  percent,
  size = 48,
  color = "#4CAF50",
  charging = false,
}: BatterySvgProps) {
  // Clamp percent between 0 and 100
  const clampedPercent = Math.max(0, Math.min(100, percent));

  // Battery dimensions (based on 24x24 viewBox, scaled by size)
  const viewBoxWidth = 24;
  const viewBoxHeight = 24;

  // Battery body dimensions
  const bodyX = 2;
  const bodyY = 6;
  const bodyWidth = 18;
  const bodyHeight = 12;
  const cornerRadius = 2;

  // Battery terminal (the small bump on the right)
  const terminalX = 20;
  const terminalY = 9;
  const terminalWidth = 2;
  const terminalHeight = 6;

  // Fill dimensions (inside the battery body with padding)
  const fillPadding = 2;
  const fillX = bodyX + fillPadding;
  const fillY = bodyY + fillPadding;
  const fillMaxWidth = bodyWidth - fillPadding * 2;
  const fillHeight = bodyHeight - fillPadding * 2;
  const fillWidth = (clampedPercent / 100) * fillMaxWidth;

  // Charging bolt path (centered in battery)
  const boltPath = "M13 6L9 12h3l-1 6 4-6h-3l1-6z";

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
    >
      {/* Battery outline */}
      <Rect
        x={bodyX}
        y={bodyY}
        width={bodyWidth}
        height={bodyHeight}
        rx={cornerRadius}
        ry={cornerRadius}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
      />

      {/* Battery terminal */}
      <Rect
        x={terminalX}
        y={terminalY}
        width={terminalWidth}
        height={terminalHeight}
        rx={1}
        ry={1}
        fill={color}
      />

      {/* Battery fill level */}
      {clampedPercent > 0 && (
        <Rect
          x={fillX}
          y={fillY}
          width={fillWidth}
          height={fillHeight}
          rx={1}
          ry={1}
          fill={color}
          opacity={0.8}
        />
      )}

      {/* Charging bolt icon */}
      {charging && (
        <Path
          d={boltPath}
          fill={clampedPercent > 50 ? "#FFFFFF" : color}
          stroke={clampedPercent > 50 ? "none" : "#FFFFFF"}
          strokeWidth={clampedPercent > 50 ? 0 : 0.5}
        />
      )}
    </Svg>
  );
}

