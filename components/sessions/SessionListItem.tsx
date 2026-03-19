import { useThemeColor } from "@/hooks/useThemeColor";
import { WorkoutSessionHistoryItem } from "@/types/workout.types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type SessionListItemProps = {
  session: WorkoutSessionHistoryItem;
  workoutTypeName?: string;
  onPress: (session: WorkoutSessionHistoryItem) => void;
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SessionListItem({
  session,
  workoutTypeName,
  onPress,
}: SessionListItemProps) {
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textTertiary = useThemeColor({}, "textTertiary");
  const borderColor = useThemeColor({}, "border");
  const cardColor = useThemeColor({}, "card");
  const cardPressedColor = useThemeColor({}, "cardPressed");
  const tintColor = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");

  const totalReps = session.totalReps;
  const setCount = session.totalSets;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { borderBottomColor: borderColor, backgroundColor: pressed ? cardPressedColor : cardColor },
      ]}
      onPress={() => onPress(session)}
    >
      <View style={styles.leftColumn}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {workoutTypeName ?? "Workout"}
        </Text>
        <Text style={[styles.date, { color: textSecondary }]}>
          {formatDate(session.startTime)} · {formatTime(session.startTime)}
        </Text>
      </View>
      <View style={styles.rightColumn}>
        <View style={styles.stats}>
          <View style={[styles.badge, { backgroundColor: tintColor + "20" }]}>
            <Text style={[styles.badgeText, { color: tintColor }]}>
              {setCount} {setCount === 1 ? "set" : "sets"}
            </Text>
          </View>
          <Text style={[styles.repCount, { color: textTertiary }]}>
            {totalReps} reps
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={iconColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftColumn: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
  },
  date: {
    fontSize: 13,
    marginTop: 3,
  },
  rightColumn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stats: {
    alignItems: "flex-end",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  repCount: {
    fontSize: 12,
  },
});
