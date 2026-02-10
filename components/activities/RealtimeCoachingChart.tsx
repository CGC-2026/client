import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { CoachingZone } from "@/types/workout.types";
import React, { useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

interface RealtimeCoachingChartProps {
  zones: CoachingZone[];
  currentQuality: "good" | "okay" | "bad" | null;
  windowSeconds?: number;
}

const screenWidth = Dimensions.get("window").width;
const CHART_HEIGHT = 220;

export const RealtimeCoachingChart: React.FC<RealtimeCoachingChartProps> = ({
  zones,
  currentQuality,
  windowSeconds = 10,
}) => {
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const tintColor = useThemeColor({}, "tint");

  // Quality colors
  const qualityColors = {
    good: "#4CAF50", // Green
    okay: "#FFA726", // Orange
    bad: "#EF5350", // Red
  };

  // Determine current quality color
  const currentQualityColor = currentQuality
    ? qualityColors[currentQuality]
    : "#999";

  const qualityText = currentQuality
    ? currentQuality.charAt(0).toUpperCase() + currentQuality.slice(1)
    : "Waiting...";

  // Prepare chart data
  const chartData = useMemo(() => {
    if (zones.length === 0) {
      // Placeholder data if empty
      return {
        labels: [],
        datasets: [{ data: [0], color: () => "transparent" }],
      };
    }

    // Get time window
    const latestTime = zones[zones.length - 1].timestamp;
    const windowMs = windowSeconds * 1000;
    const startTime = latestTime - windowMs;

    // Filter zones within window
    const windowZones = zones.filter((z) => z.timestamp >= startTime);

    if (windowZones.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0], color: () => "transparent" }],
      };
    }

    // Extract angle data
    const dataPoints = windowZones.map((z) => z.kneeAngle);

    // Generate simple time labels (just a few points)
    const labels = windowZones.length > 5 ? ["", "", "", "Now"] : [];

    return {
      labels,
      datasets: [
        {
          data: dataPoints,
          color: (opacity = 1) => tintColor, // Main line color
          strokeWidth: 2,
        },
        // Add boundary lines for reference
        {
          data: [90], // Max comfortable range
          withDots: false,
          color: () => "rgba(200, 200, 200, 0.2)",
        },
        {
          data: [0], // Neutral
          withDots: false,
          color: () => "rgba(200, 200, 200, 0.2)",
        },
      ],
      legend: ["Knee Angle"],
    };
  }, [zones, windowSeconds, tintColor]);

  const chartConfig = {
    backgroundColor: backgroundColor,
    backgroundGradientFrom: backgroundColor,
    backgroundGradientTo: backgroundColor,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => textColor,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "3",
      strokeWidth: "1",
      stroke: tintColor,
    },
    propsForBackgroundLines: {
      strokeDasharray: "", // solid lines
      stroke: useThemeColor({}, "border"),
      strokeOpacity: 0.2,
    },
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Form Quality</ThemedText>
        <View style={styles.qualityIndicator}>
          <View
            style={[
              styles.qualityDot,
              { backgroundColor: currentQualityColor },
            ]}
          />
          <ThemedText
            style={[styles.qualityText, { color: currentQualityColor }]}
          >
            {qualityText}
          </ThemedText>
        </View>
      </View>

      {zones.length === 0 ? (
        <View style={[styles.emptyState, { height: CHART_HEIGHT }]}>
          <ThemedText style={styles.emptyText}>
            Start your set to see real-time data
          </ThemedText>
        </View>
      ) : (
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={screenWidth - 40} // Full width minus padding
            height={CHART_HEIGHT}
            chartConfig={chartConfig}
            bezier // Smooth curves
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLabels={true}
            yAxisSuffix="°"
            yAxisInterval={20}
            fromZero={true}
            segments={4}
          />
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: qualityColors.good }]}
          />
          <ThemedText style={styles.legendText}>Good Range</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: qualityColors.okay }]}
          />
          <ThemedText style={styles.legendText}>Okay</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: qualityColors.bad }]}
          />
          <ThemedText style={styles.legendText}>Improve</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(150, 150, 150, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  qualityIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(150, 150, 150, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(150, 150, 150, 0.05)",
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
  chartWrapper: {
    alignItems: "center",
    overflow: "hidden",
  },
  chart: {
    borderRadius: 16,
    paddingRight: 40, // Add padding for Y-axis labels
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.1)",
    paddingTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    opacity: 0.7,
  },
});
