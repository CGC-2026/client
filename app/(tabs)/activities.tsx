import { ActiveWorkoutBanner } from "@/components/activities/ActiveWorkoutBanner";
import { SessionListItem } from "@/components/activities/SessionListItem";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useWorkout } from "@/contexts/Workout.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { WorkoutSession } from "@/types/workout.types";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ActivitiesScreen() {
  const router = useRouter();
  const workout = useWorkout();
  const tintColor = useThemeColor({}, "tint");
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await workout.refreshHistory();
    setRefreshing(false);
  }, [workout]);

  const handleStartWorkout = () => {
    if (workout.isSessionActive) {
      router.push("/workout-session");
    } else {
      router.push("/workout-type-selector");
    }
  };

  const handleSessionPress = (session: WorkoutSession) => {
    router.push({
      pathname: "/workout-detail",
      params: { sessionId: session.id },
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol
        name="figure.strengthtraining.traditional"
        size={64}
        color="#999"
      />
      <ThemedText style={styles.emptyTitle}>No Workouts Yet</ThemedText>
      <ThemedText style={styles.emptyText}>
        Start your first workout to begin tracking your progress
      </ThemedText>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Pressable
        onPress={handleStartWorkout}
        style={({ pressed }) => [
          styles.startButton,
          {
            backgroundColor: workout.isSessionActive ? "#FF3B30" : tintColor,
            opacity: workout.isSessionActive ? 0.9 : 1,
          },
          pressed && styles.startButtonPressed,
        ]}
      >
        <IconSymbol
          name={
            workout.isSessionActive
              ? "arrow.right.circle.fill"
              : "plus.circle.fill"
          }
          size={24}
          color="#fff"
        />
        <ThemedText style={styles.startButtonText}>
          {workout.isSessionActive ? "Continue Workout" : "Start New Workout"}
        </ThemedText>
        {workout.isSessionActive && (
          <View style={[styles.activeDot, { backgroundColor: "#fff" }]} />
        )}
      </Pressable>

      {workout.sessionHistory.length > 0 && (
        <View style={styles.historyHeader}>
          <ThemedText style={styles.historyTitle}>Workout History</ThemedText>
          <ThemedText style={styles.historyCount}>
            {workout.sessionHistory.length}{" "}
            {workout.sessionHistory.length === 1 ? "session" : "sessions"}
          </ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ActiveWorkoutBanner />
      <FlatList
        data={workout.sessionHistory}
        renderItem={({ item }) => {
          const workoutType = workout.workoutTypes.find(
            (wt) => wt.id === item.workoutTypeId,
          );
          return (
            <SessionListItem
              session={item}
              workoutName={workoutType?.name || "Workout"}
              onPress={handleSessionPress}
            />
          );
        }}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          workout.sessionHistory.length === 0 ? renderEmptyState : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: 24,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  startButtonPressed: {
    opacity: 0.7,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  historyCount: {
    fontSize: 14,
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 100,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
