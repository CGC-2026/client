import { useThemeColor } from "@/hooks/useThemeColor";
import { movingAverage, movingMedian } from "@/lib/math";
import { Rep } from "@/types/workout.types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

type MetricItem = {
  label: string;
  value: string;
};

type MetricSection = {
  title: string;
  items: MetricItem[];
};

function formatNumber(value: number | undefined, digits: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return (value as number).toFixed(digits);
}

function unwrapAngles(angles: number[]): number[] {
  if (angles.length === 0) return [];
  const unwrapped = [angles[0]];
  let offset = 0;
  for (let i = 1; i < angles.length; i++) {
    let diff = angles[i] - angles[i - 1];
    if (diff > 180) offset -= 360;
    else if (diff < -180) offset += 360;
    unwrapped.push(angles[i] + offset);
  }
  return unwrapped;
}

function buildSections(rep: Rep): MetricSection[] {
  const metrics = rep.metrics ?? ({} as Rep["metrics"]);
  return [
    {
      title: "Timing",
      items: [
        {
          label: "Total Duration",
          value: Number.isFinite(metrics.durationMs)
            ? `${metrics.durationMs} ms`
            : "-",
        },
        {
          label: "Down Phase",
          value: Number.isFinite(metrics.downMs) ? `${metrics.downMs} ms` : "-",
        },
        {
          label: "Up Phase",
          value: Number.isFinite(metrics.upMs) ? `${metrics.upMs} ms` : "-",
        },
        {
          label: "Pause at Bottom",
          value: Number.isFinite(metrics.pauseMs) ? `${metrics.pauseMs} ms` : "-",
        },
        {
          label: "Tempo Ratio (down/up)",
          value: formatNumber(metrics.tempoRatio, 2),
        },
      ],
    },
    {
      title: "Range of Motion",
      items: [
        { label: "Total ROM", value: `${formatNumber(metrics.romDeg, 1)}°` },
        { label: "Pitch ROM", value: `${formatNumber(metrics.pitchRomDeg, 1)}°` },
        { label: "Max Pitch", value: `${formatNumber(metrics.maxPitchDeg, 1)}°` },
        { label: "Min Pitch", value: `${formatNumber(metrics.minPitchDeg, 1)}°` },
        { label: "Roll ROM", value: `${formatNumber(metrics.rollRomDeg, 1)}°` },
        { label: "Max Roll", value: `${formatNumber(metrics.maxRollDeg, 1)}°` },
        { label: "Min Roll", value: `${formatNumber(metrics.minRollDeg, 1)}°` },
      ],
    },
    {
      title: "Alignment",
      items: [
        { label: "Peak Valgus", value: `${formatNumber(metrics.peakValgus, 1)}°` },
        {
          label: "Peak Hip Rotation",
          value: `${formatNumber(metrics.peakHipRotation, 1)}°`,
        },
        { label: "Yaw ROM", value: `${formatNumber(metrics.yawRomDeg, 1)}°` },
        { label: "Max Yaw", value: `${formatNumber(metrics.maxYawDeg, 1)}°` },
        { label: "Min Yaw", value: `${formatNumber(metrics.minYawDeg, 1)}°` },
      ],
    },
  ];
}

type RepMetricsModalProps = {
  rep: Rep | null;
  repNumber?: number;
  visible: boolean;
  onClose: () => void;
};

function AxisGraph({
  data,
  title,
  color,
  themedStyles,
  showSafetyZones = false,
}: {
  data: number[];
  title: string;
  color: string;
  themedStyles: any;
  showSafetyZones?: boolean;
}) {
  const { width: windowWidth } = useWindowDimensions();

  const chartProps = useMemo(() => {
    if (data.length === 0) return null;
  
    const startVal = data[0];
    const transformedValues = data.map((v) =>
      showSafetyZones ? Math.abs(v - startVal) : v,
    );
  
    const dataMax = Math.max(...transformedValues);
    const dataMin = Math.min(...transformedValues);
  
    // Always include 0 in the range
    const chartMin = Math.min(0, dataMin);
    const rawChartMax = Math.max(0, dataMax) * 1.15; // 15% headroom above max
    // Prevent division-by-zero / Infinity when the series is perfectly flat.
    // Using a readable default keeps the chart library stable.
    const chartMax = rawChartMax === 0 ? 1 : rawChartMax;
  
    const graphData = transformedValues.map((value) => ({ value }));
    const yAxisOffset = chartMin;
    const shiftedGraphData = graphData.map((d) => ({ value: d.value - yAxisOffset }));
    const shiftedMax = chartMax - chartMin;
  
    const noOfSections = 4;
    const stepValue = shiftedMax / noOfSections;
  
    return {
      shiftedGraphData,
      shiftedMax,
      yAxisOffset,
      noOfSections,
      stepValue,
      chartMax,
    };
  }, [data, showSafetyZones]);

  if (!chartProps) return null;

  const CHART_HEIGHT = 220;
  const Y_AXIS_WIDTH = 45;
  const chartWidth = Math.max(260, windowWidth - 32 - 24);
  const chartMax = chartProps.chartMax;
  // Safety zones are defined as value ranges:
  // 0-5 (green), 5-10 (yellow), 10-15 (orange), 15+ (red).
  // Convert zone lengths into `flex` fractions so the overlay always fits the chart.
  const zone0To5 = Math.min(chartMax, 5);
  const zone5To10 = Math.min(Math.max(chartMax - 5, 0), 5);
  const zone10To15 = Math.min(Math.max(chartMax - 10, 0), 5);
  const zone15Plus = Math.max(chartMax - 15, 0);

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={[
          themedStyles.sectionTitle,
          { marginLeft: 16, marginBottom: 10, letterSpacing: 0.6 },
        ]}
      >
        {title}
      </Text>

      <View style={{ paddingHorizontal: 16, paddingBottom: 2 }}>
        <View
          style={{
            height: CHART_HEIGHT,
            width: "100%",
            position: "relative",
            backgroundColor: themedStyles.chartBackgroundColor,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {showSafetyZones && (
            <View
              style={{
                position: "absolute",
                left: Y_AXIS_WIDTH,
                right: 0,
                top: 0,
                bottom: 0,
                flexDirection: "column",
              }}
            >
              <View
                style={{
                  flex: zone15Plus / chartMax,
                  backgroundColor: "rgba(244, 67, 54, 0.16)",
                }}
              />
              <View
                style={{
                  flex: zone10To15 / chartMax,
                  backgroundColor: "rgba(255, 152, 0, 0.14)",
                }}
              />
              <View
                style={{
                  flex: zone5To10 / chartMax,
                  backgroundColor: "rgba(255, 235, 59, 0.12)",
                }}
              />
              <View
                style={{
                  flex: zone0To5 / chartMax,
                  backgroundColor: "rgba(76, 175, 80, 0.14)",
                }}
              />
            </View>
          )}

          <LineChart
            data={chartProps.shiftedGraphData}
            height={CHART_HEIGHT}
            width={chartWidth}
            maxValue={chartProps.shiftedMax}
            yAxisOffset={chartProps.yAxisOffset}
            noOfSections={chartProps.noOfSections}
            stepValue={chartProps.stepValue}
            yAxisLabelWidth={Y_AXIS_WIDTH}
            yAxisColor={themedStyles.borderColor}
            xAxisColor={themedStyles.borderColor}
            yAxisTextStyle={{ color: themedStyles.textSecondary.color, fontSize: 11 }}
            color={color}
            thickness={2}
            dataPointsColor={color}
            dataPointsRadius={0}
            hideDataPoints={true}
            areaChart={false}
            hideRules={false}
            rulesColor={themedStyles.borderColor}
            rulesType="dashed"
            initialSpacing={0}
            endSpacing={0}
            adjustToWidth={true}
            xAxisThickness={StyleSheet.hairlineWidth}
            yAxisThickness={StyleSheet.hairlineWidth}
          />
        </View>
      </View>
    </View>
  );
}

function RotationGraphs({ rep, themedStyles }: { rep: Rep; themedStyles: any }) {
  if (!rep || !rep.samples || rep.samples.length === 0) return null;

  const processData = (rawData: number[]) => {
    const cleanData = rawData.map(v => Number.isFinite(v) ? v : 0);
    const despiked = movingMedian(cleanData, 5);
    const unwrapped = unwrapAngles(despiked);
    return movingAverage(unwrapped, 3);
  };

  const rolls = processData(rep.samples.map(s => s.roll));
  const pitches = processData(rep.samples.map(s => s.pitch));
  const yaws = processData(rep.samples.map(s => s.yaw));

  return (
    <View style={themedStyles.section}>
      <View style={themedStyles.sectionHeader}>
        <Text style={themedStyles.sectionTitle}>
          KINEMATIC GRAPHS
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.legendContainer,
          { borderBottomColor: themedStyles.borderColor },
        ]}
      >
        <View style={[styles.legendPill, { borderColor: "rgba(76, 175, 80, 0.35)" }]}>
          <View style={[styles.legendDot, { backgroundColor: "#4caf50" }]} />
          <Text style={themedStyles.legendText}>0°-5° Safe</Text>
        </View>
        <View style={[styles.legendPill, { borderColor: "rgba(255, 235, 59, 0.35)" }]}>
          <View style={[styles.legendDot, { backgroundColor: "#ffeb3b" }]} />
          <Text style={themedStyles.legendText}>5°-10° Probably Safe</Text>
        </View>
        <View style={[styles.legendPill, { borderColor: "rgba(255, 152, 0, 0.35)" }]}>
          <View style={[styles.legendDot, { backgroundColor: "#ff9800" }]} />
          <Text style={themedStyles.legendText}>10°-15° Probably Not Safe</Text>
        </View>
        <View style={[styles.legendPill, { borderColor: "rgba(244, 67, 54, 0.35)" }]}>
          <View style={[styles.legendDot, { backgroundColor: "#f44336" }]} />
          <Text style={themedStyles.legendText}>15°+ Not Safe</Text>
        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
        <AxisGraph 
          data={rolls} 
          title="FLEXION / EXTENSION (ROLL)" 
          color="#2196f3" 
          themedStyles={themedStyles} 
        />
        <AxisGraph 
          data={pitches} 
          title="VARUS / VALGUS (PITCH)" 
          color="#4caf50" 
          themedStyles={themedStyles} 
          showSafetyZones={true} 
        />
        <AxisGraph 
          data={yaws} 
          title="INTERNAL ROTATION (YAW DEVIATION)" 
          color="#f44336" 
          themedStyles={themedStyles}
          showSafetyZones={true} 
        />
      </View>
    </View>
  );
}

export default function RepMetricsModal({
  rep,
  repNumber,
  visible,
  onClose,
}: RepMetricsModalProps) {
  const themedStyles = createThemedStyles();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={themedStyles.safeArea}>
        <View style={themedStyles.header}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={themedStyles.title} numberOfLines={1}>
              Rep {repNumber ?? ""} - Details
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              themedStyles.closeButton,
              pressed ? themedStyles.closeButtonPressed : {},
            ]}
            hitSlop={8}
          >
            <Ionicons name="close" size={20} color={themedStyles.closeIconColor} />
          </Pressable>
        </View>

        <ScrollView
          style={themedStyles.scroll}
          contentContainerStyle={themedStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {rep && <RotationGraphs rep={rep} themedStyles={themedStyles} />}

          {rep
            ? buildSections(rep).map((section) => (
                <View key={section.title} style={themedStyles.section}>
                  <View style={themedStyles.sectionHeader}>
                    <Text style={themedStyles.sectionTitle}>
                      {section.title.toUpperCase()}
                    </Text>
                  </View>
                  {section.items.map((item, index) => (
                    <View
                      key={item.label}
                      style={[
                        themedStyles.row,
                        index < section.items.length - 1
                          ? themedStyles.rowBorder
                          : {},
                      ]}
                    >
                      <Text style={themedStyles.label}>{item.label}</Text>
                      <Text style={themedStyles.value}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              ))
            : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const createThemedStyles = () => {
  const backgroundColor = useThemeColor({}, "background");
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const cardPressedColor = useThemeColor({}, "cardPressed");
  const shadowColor = useThemeColor({ light: "#000000", dark: "#000000" }, "text");
  const tintColor = useThemeColor({}, "tint");
  const chartBackgroundColor = useThemeColor(
    { light: "rgba(0,0,0,0.03)", dark: "rgba(255,255,255,0.04)" },
    "background",
  );

  return {
    safeArea: {
      flex: 1,
      backgroundColor,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: borderColor,
    },
    title: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: textColor,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: cardColor,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    closeButtonPressed: {
      backgroundColor: cardPressedColor,
    },
    closeIconColor: textSecondary,
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 16,
      paddingBottom: 32,
      gap: 16,
    },
    section: {
      backgroundColor: cardColor,
      borderRadius: 10,
      marginHorizontal: 16,
      overflow: "hidden" as const,
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2.5,
      elevation: 1,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: borderColor,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600" as const,
      letterSpacing: 0.3,
      color: textSecondary,
    },
    row: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: borderColor,
    },
    label: {
      fontSize: 15,
      color: textColor,
    },
    value: {
      fontSize: 15,
      color: textSecondary,
      fontVariant: ["tabular-nums" as const],
    },
    legendText: {
      fontSize: 12,
      color: textColor,
    },
    borderColor,
    textSecondary: { color: textSecondary },
    tintColor,
    chartBackgroundColor,
  };
};

const styles = StyleSheet.create({
  legendContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(127,127,127,0.10)",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});