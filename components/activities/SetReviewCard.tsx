import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import { WorkoutSet } from "@/types/workout.types";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface SetReviewCardProps {
  set: WorkoutSet;
  onNextSet?: () => void;
  onEndWorkout?: () => void;
  showActions?: boolean;
}

export const SetReviewCard: React.FC<SetReviewCardProps> = ({
  set,
  onNextSet,
  onEndWorkout,
  showActions = true,
}) => {
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");

  const totalReps = set.reps.length;
  const goodReps = set.reps.filter((r) => r.quality === "good").length;
  const okayReps = set.reps.filter((r) => r.quality === "okay").length;
  const badReps = set.reps.filter((r) => r.quality === "bad").length;

  const duration = set.endTime
    ? Math.round((set.endTime.getTime() - set.startTime.getTime()) / 1000)
    : 0;

  // Quality color
  const qualityRatio = totalReps > 0 ? goodReps / totalReps : 0;
  const qualityColor =
    qualityRatio >= 0.7
      ? "#4CAF50"
      : qualityRatio >= 0.4
        ? "#FFA726"
        : "#EF5350";
  const qualityText =
    qualityRatio >= 0.7
      ? "Excellent Form!"
      : qualityRatio >= 0.4
        ? "Good Effort"
        : "Form Needs Work";

  return (
    <ThemedView style={styles.container}>
      {/* Top Banner */}
      <View style={[styles.banner, { backgroundColor: qualityColor }]}>
        <IconSymbol name="checkmark.seal.fill" size={32} color="#fff" />
        <View style={styles.bannerContent}>
          <ThemedText style={styles.bannerTitle}>
            Set {set.setNumber} Complete
          </ThemedText>
          <ThemedText style={styles.bannerSubtitle}>{qualityText}</ThemedText>
        </View>
      </View>

      <View style={styles.content}>
        {/* Main Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{totalReps}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Reps</ThemedText>
          </View>
          <View
            style={[styles.verticalDivider, { backgroundColor: borderColor }]}
          />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{duration}s</ThemedText>
            <ThemedText style={styles.statLabel}>Duration</ThemedText>
          </View>
          <View
            style={[styles.verticalDivider, { backgroundColor: borderColor }]}
          />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: qualityColor }]}>
              {totalReps > 0 ? Math.round(qualityRatio * 100) : 0}%
            </ThemedText>
            <ThemedText style={styles.statLabel}>Quality</ThemedText>
          </View>
        </View>

        {/* Breakdown */}
        <View style={[styles.breakdownContainer, { borderColor }]}>
          <ThemedText style={styles.breakdownHeader}>FORM BREAKDOWN</ThemedText>

          <View style={styles.barContainer}>
            {goodReps > 0 && (
              <View
                style={[
                  styles.barSegment,
                  { flex: goodReps, backgroundColor: "#4CAF50" },
                ]}
              />
            )}
            {okayReps > 0 && (
              <View
                style={[
                  styles.barSegment,
                  { flex: okayReps, backgroundColor: "#FFA726" },
                ]}
              />
            )}
            {badReps > 0 && (
              <View
                style={[
                  styles.barSegment,
                  { flex: badReps, backgroundColor: "#EF5350" },
                ]}
              />
            )}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#4CAF50" }]} />
              <ThemedText style={styles.legendText}>{goodReps} Good</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#FFA726" }]} />
              <ThemedText style={styles.legendText}>{okayReps} Okay</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#EF5350" }]} />
              <ThemedText style={styles.legendText}>{badReps} Poor</ThemedText>
            </View>
          </View>
        </View>

        {/* Actions */}
        {showActions && (
          <View style={styles.actions}>
            {onNextSet && (
              <Pressable
                onPress={onNextSet}
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  { backgroundColor: tintColor },
                  pressed && styles.buttonPressed,
                ]}
              >
                <IconSymbol
                  name="arrow.right.circle.fill"
                  size={20}
                  color="#fff"
                />
                <ThemedText style={styles.buttonText}>
                  Start Next Set
                </ThemedText>
              </Pressable>
            )}

            {onEndWorkout && (
              <Pressable
                onPress={onEndWorkout}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  { borderColor },
                  pressed && styles.buttonPressed,
                ]}
              >
                <ThemedText style={styles.secondaryButtonText}>
                  Finish Workout
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
    width: "100%",
    maxWidth: 400,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
    marginTop: 2,
  },
  content: {
    padding: 24,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  verticalDivider: {
    width: 1,
    height: "80%",
    alignSelf: "center",
    opacity: 0.2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  breakdownContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    backgroundColor: "rgba(150, 150, 150, 0.03)",
  },
  breakdownHeader: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.5,
    marginBottom: 12,
    letterSpacing: 1,
  },
  barContainer: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  barSegment: {
    height: "100%",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.8,
  },
  actions: {
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  primaryButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.8,
  },
});
