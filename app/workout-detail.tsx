import { SetReviewCard } from "@/components/activities/SetReviewCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useWorkout } from "@/contexts/Workout.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workout = useWorkout();
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");

  // Find session by ID
  const sessionId =
    typeof params.sessionId === "string" ? params.sessionId : "";
  const session = workout.sessionHistory.find((s) => s.id === sessionId);

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedText>Session not found</ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButtonSimple}
          >
            <ThemedText style={{ color: tintColor }}>Go Back</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const workoutType = workout.workoutTypes.find(
    (wt) => wt.id === session.workoutTypeId,
  );
  const totalReps = session.sets.reduce((sum, set) => sum + set.reps.length, 0);
  const duration = session.endTime
    ? Math.round(
        (session.endTime.getTime() - session.startTime.getTime()) / 60000,
      )
    : 0;

  // Calculate overall quality
  const allReps = session.sets.flatMap((set) => set.reps);
  const goodReps = allReps.filter((r) => r.quality === "good").length;
  const qualityRatio = totalReps > 0 ? goodReps / totalReps : 0;
  const qualityColor =
    qualityRatio >= 0.7
      ? "#4CAF50"
      : qualityRatio >= 0.4
        ? "#FFA726"
        : "#EF5350";

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={tintColor} />
          </Pressable>
          <View style={styles.headerInfo}>
            <ThemedText style={styles.workoutName}>
              {workoutType?.name || "Workout"}
            </ThemedText>
            <ThemedText style={styles.date}>
              {formatDate(session.startTime)}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Summary Stats */}
        <ThemedView style={[styles.summaryContainer, { borderColor }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>
                {session.sets.length}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Sets</ThemedText>
            </View>

            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>{totalReps}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Total Reps</ThemedText>
            </View>

            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>{duration}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Minutes</ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.qualityRow}>
            <View style={styles.qualityHeader}>
              <ThemedText style={styles.qualityLabel}>
                Overall Quality
              </ThemedText>
              <View style={styles.qualityIndicator}>
                <View
                  style={[styles.qualityDot, { backgroundColor: qualityColor }]}
                />
                <ThemedText
                  style={[styles.qualityPercent, { color: qualityColor }]}
                >
                  {Math.round(qualityRatio * 100)}%
                </ThemedText>
              </View>
            </View>

            <View style={styles.qualityBreakdown}>
              <View style={styles.qualityItem}>
                <View
                  style={[styles.qualityDot, { backgroundColor: "#4CAF50" }]}
                />
                <ThemedText style={styles.qualityText}>
                  {allReps.filter((r) => r.quality === "good").length} Good
                </ThemedText>
              </View>
              <View style={styles.qualityItem}>
                <View
                  style={[styles.qualityDot, { backgroundColor: "#FFA726" }]}
                />
                <ThemedText style={styles.qualityText}>
                  {allReps.filter((r) => r.quality === "okay").length} Okay
                </ThemedText>
              </View>
              <View style={styles.qualityItem}>
                <View
                  style={[styles.qualityDot, { backgroundColor: "#EF5350" }]}
                />
                <ThemedText style={styles.qualityText}>
                  {allReps.filter((r) => r.quality === "bad").length} Bad
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>

        {/* Sets */}
        <View style={styles.setsContainer}>
          <ThemedText style={styles.sectionTitle}>Sets</ThemedText>
          {session.sets.map((set) => (
            <SetReviewCard key={set.id} set={set} showActions={false} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonSimple: {
    marginTop: 16,
    padding: 12,
  },
  headerInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 34,
    paddingTop: 4,
  },
  date: {
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 20,
  },
  summaryContainer: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
    fontVariant: ["tabular-nums"],
    lineHeight: 40,
    paddingTop: 4,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  qualityRow: {
    gap: 16,
  },
  qualityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qualityLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  qualityIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qualityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  qualityPercent: {
    fontSize: 18,
    fontWeight: "700",
  },
  qualityBreakdown: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  qualityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qualityText: {
    fontSize: 14,
  },
  setsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    lineHeight: 28,
    paddingTop: 4,
  },
});
