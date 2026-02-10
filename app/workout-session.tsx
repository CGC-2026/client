import { RealtimeCoachingChart } from "@/components/activities/RealtimeCoachingChart";
import { SetReviewCard } from "@/components/activities/SetReviewCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useWorkout } from "@/contexts/Workout.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workout = useWorkout();
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");
  const backgroundColor = useThemeColor({}, "background");

  const [showSetReview, setShowSetReview] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [setTime, setSetTime] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Start session on mount if workoutTypeId provided
  useEffect(() => {
    const startSession = async () => {
      if (params.workoutTypeId && typeof params.workoutTypeId === "string") {
        await workout.startSession(params.workoutTypeId);
      }
    };

    if (!workout.isSessionActive && params.workoutTypeId) {
      startSession();
    }
  }, [params.workoutTypeId]);

  // Track elapsed time
  useEffect(() => {
    if (!workout.activeSession) return;

    const interval = setInterval(() => {
      if (workout.activeSession) {
        const elapsed = Math.floor(
          (Date.now() - workout.activeSession.startTime.getTime()) / 1000
        );
        setElapsedTime(elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [workout.activeSession]);

  // Track set time
  useEffect(() => {
    if (!workout.activeSet) {
      setSetTime(0);
      return;
    }

    const interval = setInterval(() => {
      if (workout.activeSet) {
        const elapsed = Math.floor(
          (Date.now() - workout.activeSet.startTime.getTime()) / 1000
        );
        setSetTime(elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [workout.activeSet]);

  // Show set review when set ends
  useEffect(() => {
    if (
      workout.activeSession &&
      workout.activeSession.sets.length > 0 &&
      !workout.isSetActive
    ) {
      const lastSet = workout.activeSession.sets[workout.activeSession.sets.length - 1];
      if (lastSet?.endTime) {
        setShowSetReview(true);
      }
    }
  }, [workout.activeSession?.sets.length, workout.isSetActive]);

  // Pulse animation for Live Activity indicator
  useEffect(() => {
    if (workout.isSetActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [workout.isSetActive, pulseAnim]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartSet = async () => {
    await workout.startSet();
  };

  const handleStopSet = async () => {
    await workout.endSet();
  };

  const handleNextSet = () => {
    setShowSetReview(false);
  };

  const handleEndWorkout = async () => {
    setShowSetReview(false);
    await workout.endSession();
    router.back();
  };

  const handleBackPress = () => {
    if (workout.isSessionActive) {
      // Could show confirmation dialog here
      handleEndWorkout();
    } else {
      router.back();
    }
  };

  if (!workout.activeSession || !workout.selectedWorkoutType) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.loadingContent}>
          <IconSymbol name="figure.run" size={48} color={tintColor} />
          <ThemedText style={styles.loadingText}>Initializing Session...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const totalSets = workout.activeSession.sets.length;
  const totalReps = workout.detectedReps.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={tintColor} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <ThemedText style={styles.workoutName}>
              {workout.selectedWorkoutType.name}
            </ThemedText>
            {workout.isSetActive && Platform.OS === "ios" && (
              <Animated.View
                style={[
                  styles.liveActivityIndicator,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <View style={[styles.liveDot, { backgroundColor: "#FF3B30" }]} />
                <ThemedText style={styles.liveText}>LIVE</ThemedText>
              </Animated.View>
            )}
          </View>
          <ThemedText style={styles.timer}>{formatTime(elapsedTime)}</ThemedText>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </ThemedView>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <ThemedView style={[styles.statCard, { borderColor }]}>
            <ThemedText style={styles.statLabel}>SETS</ThemedText>
            <ThemedText style={styles.statValue}>{totalSets}</ThemedText>
          </ThemedView>
          
          <ThemedView style={[styles.statCard, { borderColor }]}>
            <ThemedText style={styles.statLabel}>
              {workout.isSetActive ? "CURRENT REPS" : "TOTAL REPS"}
            </ThemedText>
            <ThemedText style={[styles.statValue, { color: tintColor }]}>
              {totalReps}
            </ThemedText>
          </ThemedView>

          {workout.isSetActive && (
            <ThemedView style={[styles.statCard, { borderColor }]}>
              <ThemedText style={styles.statLabel}>SET TIME</ThemedText>
              <ThemedText style={styles.statValue}>{formatTime(setTime)}</ThemedText>
            </ThemedView>
          )}
        </View>

        {/* Real-time coaching chart */}
        {workout.isSetActive ? (
          <RealtimeCoachingChart
            zones={workout.realtimeCoachingZones}
            currentQuality={workout.currentQuality}
          />
        ) : (
          <ThemedView style={[styles.placeholderChart, { borderColor }]}>
            <IconSymbol name="chart.xyaxis.line" size={48} color="#ccc" />
            <ThemedText style={styles.placeholderText}>
              Charts will appear here during your set
            </ThemedText>
          </ThemedView>
        )}

        {/* Instructions */}
        {!workout.isSetActive && totalSets === 0 && (
          <ThemedView style={styles.instructionsCard}>
            <IconSymbol name="info.circle.fill" size={24} color={tintColor} />
            <ThemedText style={styles.instructionsText}>
              Ready to start? Tap the button below to begin your first set.
              We'll track your reps and form automatically.
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>

      {/* Bottom Action Bar - Hide when modal is open to prevent visual clutter */}
      {!showSetReview && (
        <ThemedView style={[styles.actionBar, { borderTopColor: borderColor }]}>
          <View style={styles.actionButtonContainer}>
            {!workout.isSetActive ? (
              <Pressable
                onPress={handleStartSet}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: tintColor },
                  pressed && styles.buttonPressed,
                ]}
              >
                <IconSymbol name="play.fill" size={24} color="#fff" />
                <ThemedText style={styles.primaryButtonText}>
                  {totalSets === 0 ? "START WORKOUT" : "START NEXT SET"}
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleStopSet}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.stopButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <IconSymbol name="stop.fill" size={24} color="#fff" />
                <ThemedText style={styles.primaryButtonText}>STOP SET</ThemedText>
              </Pressable>
            )}
          </View>

          {!workout.isSetActive && totalSets > 0 && (
            <Pressable
              onPress={handleEndWorkout}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: "#EF5350" }]}>
                End Workout
              </ThemedText>
            </Pressable>
          )}
        </ThemedView>
      )}

      {/* Set Review Modal */}
      <Modal
        visible={showSetReview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSetReview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            {workout.activeSession.sets.length > 0 && (
              <SetReviewCard
                set={
                  workout.activeSession.sets[
                    workout.activeSession.sets.length - 1
                  ]
                }
                onNextSet={handleNextSet}
                onEndWorkout={handleEndWorkout}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.1)",
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerRightPlaceholder: {
    width: 44,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  liveActivityIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#FF3B3020",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF3B30",
    letterSpacing: 0.5,
  },
  timer: {
    fontSize: 14,
    opacity: 0.6,
    fontVariant: ["tabular-nums"],
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Space for action bar
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(150, 150, 150, 0.05)",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.5,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    lineHeight: 36, // Added line height
    paddingTop: 4, // Added padding
  },
  placeholderChart: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(150, 150, 150, 0.03)",
    gap: 12,
    marginVertical: 12,
  },
  placeholderText: {
    opacity: 0.5,
    fontSize: 14,
  },
  instructionsCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    gap: 16,
    alignItems: "center",
    marginTop: 8,
  },
  instructionsText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
    backgroundColor: "inherit", // Inherit from parent ThemedView
  },
  actionButtonContainer: {
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButton: {
    backgroundColor: "#EF5350",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
});
