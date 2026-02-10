import { WorkoutTypeCard } from "@/components/activities/WorkoutTypeCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useWorkout } from "@/contexts/Workout.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { WorkoutType } from "@/types/workout.types";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WorkoutTypeSelectorScreen() {
  const router = useRouter();
  const workout = useWorkout();
  const tintColor = useThemeColor({}, "tint");

  const handleSelectWorkout = async (workoutType: WorkoutType) => {
    // Navigate to workout session with the selected type
    router.push({
      pathname: "/workout-session",
      params: { workoutTypeId: workoutType.id },
    });
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="chevron.left" size={24} color={tintColor} />
          </Pressable>
        </View>
        <ThemedText style={styles.headerTitle}>Select Workout</ThemedText>
        <View style={styles.headerRight} />
      </ThemedView>

      <ScrollView style={styles.content}>
        {workout.isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading workouts...</ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Available</ThemedText>
              {workout.workoutTypes.map((workoutType) => (
                <WorkoutTypeCard
                  key={workoutType.id}
                  workoutType={workoutType}
                  onPress={handleSelectWorkout}
                  disabled={!workout.isDeviceConnected}
                />
              ))}
            </View>
            {workout.workoutTypes.length === 0 && (
              <View style={styles.emptyState}>
                <IconSymbol name="questionmark.circle" size={48} color="#999" />
                <ThemedText style={styles.emptyText}>
                  No workouts available
                </ThemedText>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    width: 40,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    opacity: 0.6,
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: 24, // Added line height
    paddingVertical: 4, // Added padding to prevent cutoff
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
