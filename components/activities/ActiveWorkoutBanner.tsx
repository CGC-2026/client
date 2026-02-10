import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useWorkout } from "@/contexts/Workout.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

/**
 * Banner that displays when a workout session is active
 * Shows workout name, current progress, and action buttons
 */
export const ActiveWorkoutBanner: React.FC = () => {
  const router = useRouter();
  const workout = useWorkout();
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");

  const [, forceUpdate] = useState(0);

  // Calculate elapsed time in real-time - MUST be called unconditionally
  const elapsedTime = useMemo(() => {
    if (!workout.activeSession?.startTime) return 0;
    return Math.floor(
      (Date.now() - workout.activeSession.startTime.getTime()) / 1000,
    );
  }, [workout.activeSession?.startTime, forceUpdate]);

  const setElapsedTime = useMemo(() => {
    if (!workout.activeSet?.startTime) return 0;
    return Math.floor(
      (Date.now() - workout.activeSet.startTime.getTime()) / 1000,
    );
  }, [workout.activeSet?.startTime, forceUpdate]);

  // Force re-render every second to update timer - MUST be called unconditionally
  useEffect(() => {
    if (!workout.isSessionActive) return;

    const interval = setInterval(() => {
      forceUpdate((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [workout.isSessionActive]);

  // Don't show banner if no active session - check AFTER all hooks
  if (!workout.isSessionActive) {
    return null;
  }

  const totalReps =
    workout.activeSession?.sets.reduce(
      (sum, set) => sum + set.reps.length,
      0,
    ) || 0;
  const currentSetNumber = workout.activeSession?.sets.length || 0;
  const currentSetReps = workout.detectedReps.length;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleResume = () => {
    router.push("/workout-session");
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          backgroundColor: tintColor + "15",
          borderBottomColor: borderColor,
        },
      ]}
    >
      <Pressable
        style={styles.content}
        onPress={handleResume}
        android_ripple={{ color: tintColor + "30" }}
      >
        <ThemedView style={styles.iconContainer}>
          <IconSymbol
            name="figure.strengthtraining.traditional"
            size={20}
            color={tintColor}
          />
        </ThemedView>

        <ThemedView style={styles.textContainer}>
          <ThemedText style={styles.title}>
            {workout.selectedWorkoutType?.name || "Workout"} •{" "}
            {formatTime(elapsedTime)}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {workout.isSetActive ? (
              <>
                Set {currentSetNumber + 1} • {formatTime(setElapsedTime)}
                {" • "}
                {currentSetReps} {currentSetReps === 1 ? "Rep" : "Reps"}
              </>
            ) : (
              <>
                {currentSetNumber} {currentSetNumber === 1 ? "Set" : "Sets"}
                {" • "}
                {totalReps + currentSetReps} Total Reps
              </>
            )}
          </ThemedText>
        </ThemedView>

        <Pressable
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleResume}
        >
          <ThemedText style={styles.buttonText}>Resume</ThemedText>
        </Pressable>
      </Pressable>

      {workout.isSetActive && (
        <ThemedView
          style={[styles.activeDot, { backgroundColor: "#FF3B30" }]}
        />
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    position: "relative",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  textContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
    fontVariant: ["tabular-nums"],
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    fontVariant: ["tabular-nums"],
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  closeButton: {
    padding: 8,
    marginLeft: -4,
  },
  activeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
