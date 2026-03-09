import EmptyState from "@/components/bluetooth/EmptyState";
import SessionListItem from "@/components/sessions/SessionListItem";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/Auth.Provider";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { useWorkoutTypes } from "@/hooks/useWorkoutTypes";
import { useThemeColor } from "@/hooks/useThemeColor";
import { WorkoutSession } from "@/types/workout.types";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

export default function ActivitiesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const tintColor = useThemeColor({}, "tint");

  const {
    data: sessions,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useSessionHistory(user?.id ?? "");

  const { data: workoutTypes } = useWorkoutTypes();

  const getWorkoutTypeName = useCallback(
    (workoutTypeId: string) =>
      workoutTypes?.find((wt) => wt.id === workoutTypeId)?.name,
    [workoutTypes],
  );

  const handleSessionPress = useCallback(
    (session: WorkoutSession) => {
      router.push({ pathname: "/session/[id]", params: { id: session.id } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: WorkoutSession }) => (
      <SessionListItem
        session={item}
        workoutTypeName={getWorkoutTypeName(item.workoutTypeId)}
        onPress={handleSessionPress}
      />
    ),
    [getWorkoutTypeName, handleSessionPress],
  );

  return (
    <ThemedView style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <EmptyState
            isScanning={false}
            message="Couldn't load activities"
            subMessage="Pull down to try again"
          />
        </View>
      ) : (
        <FlashList
          data={sessions ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <EmptyState
                isScanning={false}
                message="No workouts recorded yet"
                subMessage="Complete a workout to see it here"
              />
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={tintColor}
            />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 32,
  },
});
