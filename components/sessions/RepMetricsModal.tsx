import { useThemeColor } from "@/hooks/useThemeColor";
import { Rep } from "@/types/workout.types";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
    return "—";
  }
  return (value as number).toFixed(digits);
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
            : "—",
        },
        {
          label: "Down Phase",
          value: Number.isFinite(metrics.downMs) ? `${metrics.downMs} ms` : "—",
        },
        {
          label: "Up Phase",
          value: Number.isFinite(metrics.upMs) ? `${metrics.upMs} ms` : "—",
        },
        {
          label: "Pause at Bottom",
          value: Number.isFinite(metrics.pauseMs) ? `${metrics.pauseMs} ms` : "—",
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
          <Text style={themedStyles.title}>
            Rep {repNumber ?? ""} — Details
          </Text>
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
        >
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
      paddingVertical: 24,
      paddingBottom: 40,
      gap: 20,
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
  };
};
