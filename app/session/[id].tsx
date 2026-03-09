import RepMetricsModal from "@/components/sessions/RepMetricsModal";
import SetAccordionItem from "@/components/sessions/SetAccordionItem";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/Auth.Provider";
import { useSessionHistory, useWorkoutTypes } from "@/hooks/useWorkoutQueries";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Rep, SessionSet } from "@/types/workout.types";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
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

function formatDuration(start: Date, end?: Date): string {
  if (!end) return "In progress";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const themedStyles = createThemedStyles();

  const { data: sessions } = useSessionHistory(user?.id ?? "");
  const { data: workoutTypes } = useWorkoutTypes();

  const session = sessions?.find((s) => s.id === id);
  const workoutTypeName = workoutTypes?.find(
    (wt) => wt.id === session?.workoutTypeId,
  )?.name;

  const [selectedRep, setSelectedRep] = useState<Rep | null>(null);
  const [selectedRepNumber, setSelectedRepNumber] = useState<number | undefined>();

  const handleRepPress = useCallback((rep: Rep, repNumber: number) => {
    setSelectedRep(rep);
    setSelectedRepNumber(repNumber);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedRep(null);
    setSelectedRepNumber(undefined);
  }, []);

  const renderSet = useCallback(
    ({ item }: { item: SessionSet }) => (
      <SetAccordionItem set={item} onRepPress={handleRepPress} />
    ),
    [handleRepPress],
  );

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Session" }} />
        <View style={styles.centered}>
          <Text style={themedStyles.notFoundText}>Session not found</Text>
        </View>
      </ThemedView>
    );
  }

  const totalReps = session.sets.reduce((acc, s) => acc + s.reps.length, 0);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: workoutTypeName ?? "Session",
          headerBackTitle: "Activities",
          headerStyle: { backgroundColor: themedStyles.headerBackground },
          headerShadowVisible: false,
        }}
      />

      <FlatList
        data={session.sets}
        renderItem={renderSet}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={themedStyles.headerCard}>
            <Text style={themedStyles.workoutName}>
              {workoutTypeName ?? "Workout"}
            </Text>
            <Text style={themedStyles.dateText}>
              {formatDate(session.startTime)}
            </Text>
            <Text style={themedStyles.timeText}>
              {formatTime(session.startTime)}
            </Text>
            <View style={themedStyles.statsRow}>
              <View style={themedStyles.statItem}>
                <Text style={themedStyles.statValue}>
                  {session.sets.length}
                </Text>
                <Text style={themedStyles.statLabel}>Sets</Text>
              </View>
              <View style={themedStyles.statDivider} />
              <View style={themedStyles.statItem}>
                <Text style={themedStyles.statValue}>{totalReps}</Text>
                <Text style={themedStyles.statLabel}>Reps</Text>
              </View>
              <View style={themedStyles.statDivider} />
              <View style={themedStyles.statItem}>
                <Text style={themedStyles.statValue}>
                  {formatDuration(session.startTime, session.endTime)}
                </Text>
                <Text style={themedStyles.statLabel}>Duration</Text>
              </View>
            </View>
          </View>
        }
        ListHeaderComponentStyle={styles.listHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptySets}>
            <Text style={themedStyles.emptyText}>No sets recorded</Text>
          </View>
        }
      />

      <RepMetricsModal
        rep={selectedRep}
        repNumber={selectedRepNumber}
        visible={selectedRep !== null}
        onClose={handleModalClose}
      />
    </ThemedView>
  );
}

const createThemedStyles = () => {
  const backgroundColor = useThemeColor({}, "background");
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tintColor = useThemeColor({}, "tint");
  const shadowColor = useThemeColor({ light: "#000000", dark: "#000000" }, "text");

  return {
    headerBackground: backgroundColor,
    notFoundText: {
      fontSize: 17,
      color: textSecondary,
    },
    headerCard: {
      backgroundColor: cardColor,
      borderRadius: 10,
      marginHorizontal: 16,
      padding: 20,
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2.5,
      elevation: 1,
    },
    workoutName: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: textColor,
      marginBottom: 4,
    },
    dateText: {
      fontSize: 15,
      color: textSecondary,
    },
    timeText: {
      fontSize: 13,
      color: textSecondary,
      marginTop: 2,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: borderColor,
      paddingTop: 16,
    },
    statItem: {
      flex: 1,
      alignItems: "center" as const,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: tintColor,
      fontVariant: ["tabular-nums" as const],
    },
    statLabel: {
      fontSize: 12,
      color: textSecondary,
      marginTop: 2,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 32,
      backgroundColor: borderColor,
    },
    emptyText: {
      fontSize: 15,
      color: textSecondary,
    },
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listHeader: {
    marginBottom: 20,
  },
  listContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  emptySets: {
    alignItems: "center",
    paddingVertical: 24,
  },
});
