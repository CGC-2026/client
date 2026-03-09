import { useThemeColor } from "@/hooks/useThemeColor";
import { WorkoutConfiguration } from "@/types/workout.types";
import { StyleSheet, Text, View } from "react-native";

type WorkoutConfigCardProps = {
  configuration: WorkoutConfiguration;
};

type ConfigRow = {
  label: string;
  value: string;
};

function buildRows(config: WorkoutConfiguration): ConfigRow[] {
  return [
    { label: "Min Rep Duration", value: `${config.minRepDuration} ms` },
    { label: "Max Rep Duration", value: `${config.maxRepDuration} ms` },
    { label: "Min Depth Angle", value: `${config.minDepthAngle}°` },
    { label: "Start Threshold", value: `${config.startThreshold}°` },
    { label: "End Threshold", value: `${config.endThreshold}°` },
    { label: "Min Gap Between Reps", value: `${config.minGapMs} ms` },
    { label: "Smoothing Window", value: `${config.smoothWindow} samples` },
  ];
}

export default function WorkoutConfigCard({ configuration }: WorkoutConfigCardProps) {
  const themedStyles = createThemedStyles();
  const rows = buildRows(configuration);

  return (
    <View style={themedStyles.card}>
      <View style={themedStyles.header}>
        <Text style={themedStyles.headerText}>CONFIGURATION</Text>
      </View>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[
            themedStyles.row,
            index < rows.length - 1 ? themedStyles.rowBorder : {},
          ]}
        >
          <Text style={themedStyles.label}>{row.label}</Text>
          <Text style={themedStyles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const createThemedStyles = () => {
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const shadowColor = useThemeColor({ light: "#000000", dark: "#000000" }, "text");

  return StyleSheet.create({
    card: {
      backgroundColor: cardColor,
      borderRadius: 10,
      marginHorizontal: 16,
      overflow: "hidden",
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2.5,
      elevation: 1,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: borderColor,
    },
    headerText: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.3,
      color: textSecondary,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
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
      fontVariant: ["tabular-nums"],
    },
  });
};
