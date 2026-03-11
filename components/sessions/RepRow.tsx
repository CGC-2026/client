import { useThemeColor } from "@/hooks/useThemeColor";
import { Rep } from "@/types/workout.types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type RepRowProps = {
  rep: Rep;
  repNumber: number;
  onPress: (rep: Rep) => void;
};

export default function RepRow({ rep, repNumber, onPress }: RepRowProps) {
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const cardPressedColor = useThemeColor({}, "cardPressed");
  const iconColor = useThemeColor({}, "icon");
  const tintColor = useThemeColor({}, "tint");

  const hasDuration = Number.isFinite(rep.metrics?.durationMs);
  const hasRom = Number.isFinite(rep.metrics?.romDeg);

  const durationSec = hasDuration
    ? ((rep.metrics!.durationMs ?? 0) / 1000).toFixed(1)
    : "—";
  const rom = hasRom ? (rep.metrics!.romDeg ?? 0).toFixed(1) : "—";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { borderBottomColor: borderColor },
        pressed ? { backgroundColor: cardPressedColor } : {},
      ]}
      onPress={() => onPress(rep)}
    >
      <View style={[styles.repBadge, { backgroundColor: tintColor + "15" }]}>
        <Text style={[styles.repNumber, { color: tintColor }]}>{repNumber}</Text>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metricItem}>
          <Ionicons name="time-outline" size={13} color={textSecondary} />
          <Text style={[styles.metricValue, { color: textColor }]}>
            {durationSec}s
          </Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.metricItem}>
          <Ionicons name="trending-down-outline" size={13} color={textSecondary} />
          <Text style={[styles.metricValue, { color: textColor }]}>
            {rom}°
          </Text>
          <Text style={[styles.metricLabel, { color: textSecondary }]}>ROM</Text>
        </View>
      </View>
      <View style={styles.hint}>
        <Text style={[styles.hintText, { color: textSecondary }]}>Details</Text>
        <Ionicons name="chevron-forward" size={14} color={iconColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  repBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  repNumber: {
    fontSize: 13,
    fontWeight: "700",
  },
  metrics: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    fontSize: 12,
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  hintText: {
    fontSize: 12,
  },
});
