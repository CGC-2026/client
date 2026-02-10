import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import { WorkoutSession } from "@/types/workout.types";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface SessionListItemProps {
  session: WorkoutSession;
  workoutName: string;
  onPress: (session: WorkoutSession) => void;
}

export const SessionListItem: React.FC<SessionListItemProps> = ({
  session,
  workoutName,
  onPress,
}) => {
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");

  // Calculate stats
  const totalSets = session.sets.length;
  const totalReps = session.sets.reduce((sum, set) => sum + set.reps.length, 0);
  const duration = session.endTime
    ? Math.round(
        (session.endTime.getTime() - session.startTime.getTime()) / 60000,
      )
    : 0;

  // Format date
  const formatDate = (date: Date) => {
    const today = new Date();
    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Calculate quality indicator
  const goodReps = session.sets.reduce(
    (sum, set) => sum + set.reps.filter((r) => r.quality === "good").length,
    0,
  );
  const okayReps = session.sets.reduce(
    (sum, set) => sum + set.reps.filter((r) => r.quality === "okay").length,
    0,
  );
  const badReps = session.sets.reduce(
    (sum, set) => sum + set.reps.filter((r) => r.quality === "bad").length,
    0,
  );
  const qualityRatio = totalReps > 0 ? goodReps / totalReps : 0;
  const qualityColor =
    qualityRatio >= 0.7
      ? "#4CAF50"
      : qualityRatio >= 0.4
        ? "#FFA726"
        : "#EF5350";
  const qualityLabel =
    qualityRatio >= 0.7
      ? "Excellent"
      : qualityRatio >= 0.4
        ? "Good"
        : "Needs Work";

  return (
    <Pressable
      onPress={() => onPress(session)}
      style={({ pressed }) => [
        styles.container,
        { borderColor, backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.leftBorder, { backgroundColor: qualityColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ThemedText style={styles.workoutName}>{workoutName}</ThemedText>
            <ThemedText style={styles.date}>
              {formatDate(session.startTime)}
            </ThemedText>
          </View>

          <View
            style={[
              styles.qualityBadge,
              { backgroundColor: qualityColor + "15" },
            ]}
          >
            <View
              style={[styles.qualityDot, { backgroundColor: qualityColor }]}
            />
            <ThemedText style={[styles.qualityLabel, { color: qualityColor }]}>
              {qualityLabel}
            </ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <IconSymbol name="list.bullet" size={16} color={tintColor} />
            <ThemedText style={styles.statText}>
              {totalSets} {totalSets === 1 ? "set" : "sets"}
            </ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.stat}>
            <IconSymbol
              name="figure.strengthtraining.traditional"
              size={16}
              color={tintColor}
            />
            <ThemedText style={styles.statText}>
              {totalReps} {totalReps === 1 ? "rep" : "reps"}
            </ThemedText>
          </View>

          {duration > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <IconSymbol name="clock" size={16} color={tintColor} />
                <ThemedText style={styles.statText}>{duration} min</ThemedText>
              </View>
            </>
          )}
        </View>

        {/* Quality breakdown */}
        {totalReps > 0 && (
          <View style={styles.qualityBreakdown}>
            <View style={styles.qualityBar}>
              {goodReps > 0 && (
                <View
                  style={[
                    styles.qualitySegment,
                    {
                      backgroundColor: "#4CAF50",
                      width: `${(goodReps / totalReps) * 100}%`,
                    },
                  ]}
                />
              )}
              {okayReps > 0 && (
                <View
                  style={[
                    styles.qualitySegment,
                    {
                      backgroundColor: "#FFA726",
                      width: `${(okayReps / totalReps) * 100}%`,
                    },
                  ]}
                />
              )}
              {badReps > 0 && (
                <View
                  style={[
                    styles.qualitySegment,
                    {
                      backgroundColor: "#EF5350",
                      width: `${(badReps / totalReps) * 100}%`,
                    },
                  ]}
                />
              )}
            </View>
            <ThemedText style={styles.qualityBreakdownText}>
              {goodReps > 0 && `${goodReps} good`}
              {goodReps > 0 && (okayReps > 0 || badReps > 0) && " • "}
              {okayReps > 0 && `${okayReps} okay`}
              {okayReps > 0 && badReps > 0 && " • "}
              {badReps > 0 && `${badReps} bad`}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.chevronContainer}>
        <IconSymbol name="chevron.right" size={20} color="#999" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  leftBorder: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  workoutName: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  date: {
    fontSize: 13,
    opacity: 0.6,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    opacity: 0.75,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: "#ccc",
    marginHorizontal: 12,
    opacity: 0.4,
  },
  qualityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  qualityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  qualityLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  qualityBreakdown: {
    gap: 8,
  },
  qualityBar: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(150, 150, 150, 0.1)",
  },
  qualitySegment: {
    height: "100%",
  },
  qualityBreakdownText: {
    fontSize: 11,
    opacity: 0.6,
    fontWeight: "500",
  },
  chevronContainer: {
    justifyContent: "center",
    paddingRight: 16,
  },
});
