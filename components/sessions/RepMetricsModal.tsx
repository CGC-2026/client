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

function buildSections(rep: Rep): MetricSection[] {
  const { metrics } = rep;
  return [
    {
      title: "Timing",
      items: [
        { label: "Total Duration", value: `${metrics.durationMs} ms` },
        { label: "Down Phase", value: `${metrics.downMs} ms` },
        { label: "Up Phase", value: `${metrics.upMs} ms` },
        { label: "Pause at Bottom", value: `${metrics.pauseMs} ms` },
        {
          label: "Tempo Ratio (down/up)",
          value: metrics.tempoRatio.toFixed(2),
        },
      ],
    },
    {
      title: "Range of Motion",
      items: [
        { label: "Total ROM", value: `${metrics.romDeg.toFixed(1)}°` },
        { label: "Pitch ROM", value: `${metrics.pitchRomDeg.toFixed(1)}°` },
        { label: "Max Pitch", value: `${metrics.maxPitchDeg.toFixed(1)}°` },
        { label: "Min Pitch", value: `${metrics.minPitchDeg.toFixed(1)}°` },
        { label: "Roll ROM", value: `${metrics.rollRomDeg.toFixed(1)}°` },
        { label: "Max Roll", value: `${metrics.maxRollDeg.toFixed(1)}°` },
        { label: "Min Roll", value: `${metrics.minRollDeg.toFixed(1)}°` },
      ],
    },
    {
      title: "Alignment",
      items: [
        { label: "Peak Valgus", value: `${metrics.peakValgus.toFixed(1)}°` },
        {
          label: "Peak Hip Rotation",
          value: `${metrics.peakHipRotation.toFixed(1)}°`,
        },
        { label: "Yaw ROM", value: `${metrics.yawRomDeg.toFixed(1)}°` },
        { label: "Max Yaw", value: `${metrics.maxYawDeg.toFixed(1)}°` },
        { label: "Min Yaw", value: `${metrics.minYawDeg.toFixed(1)}°` },
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
