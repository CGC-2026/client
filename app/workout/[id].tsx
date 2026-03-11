import { ThemedView } from "@/components/ThemedView";
import { useBLE } from "@/contexts/BLE.Provider";
import { useWorkoutContext } from "@/contexts/Workout.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWorkoutTypes } from "@/hooks/useWorkoutQueries";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workoutTypes } = useWorkoutTypes();
  const { pairedDevice } = useBLE();
  const { startNewSession } = useWorkoutContext();
  const router = useRouter();
  const themedStyles = createThemedStyles();

  const [isStarting, setIsStarting] = useState(false);

  const workoutType = workoutTypes?.find((w) => w.id === id);

  if (!workoutType) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Workout" }} />
        <View style={styles.centered}>
          <Text style={themedStyles.notFoundText}>Workout not found</Text>
        </View>
      </ThemedView>
    );
  }

  const handleStartWorkout = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await startNewSession(workoutType.id);
      router.push({
        pathname: "/active-workout",
        params: { workoutTypeId: workoutType.id, workoutTypeName: workoutType.name },
      });
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, startNewSession, workoutType, router]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: workoutType.name,
          headerBackTitle: "Home",
          headerStyle: { backgroundColor: themedStyles.headerBackground },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.content}>
        {workoutType.description ? (
          <View style={themedStyles.descriptionCard}>
            <Text style={themedStyles.description}>
              {workoutType.description}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={themedStyles.footer}>
        {!pairedDevice ? (
          <View style={themedStyles.gateNotice}>
            <Ionicons
              name="bluetooth-outline"
              size={14}
              color={themedStyles.gateNoticeColor}
            />
            <Text style={themedStyles.gateNoticeText}>
              Connect your knee device to start
            </Text>
          </View>
        ) : null}
        <Pressable
          style={({ pressed }) => [
            themedStyles.startButton,
            !pairedDevice ? themedStyles.startButtonDisabled : {},
            pressed && pairedDevice ? themedStyles.startButtonPressed : {},
          ]}
          onPress={handleStartWorkout}
          disabled={!pairedDevice || isStarting}
        >
          {isStarting ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.startButtonIcon} />
          ) : (
            <Ionicons
              name="play-circle"
              size={20}
              color={pairedDevice ? "#FFFFFF" : themedStyles.startButtonIconDisabledColor}
              style={styles.startButtonIcon}
            />
          )}
          <Text
            style={[
              themedStyles.startButtonText,
              !pairedDevice ? themedStyles.startButtonTextDisabled : {},
            ]}
          >
            {isStarting ? "Starting…" : "Start Workout"}
          </Text>
        </Pressable>
      </View>
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

  const tintPressed = useThemeColor({ light: "#005EC2", dark: "#4A80EE" }, "tint");

  return {
    headerBackground: backgroundColor,
    notFoundText: {
      fontSize: 17,
      color: textSecondary,
    },
    descriptionCard: {
      backgroundColor: cardColor,
      borderRadius: 10,
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2.5,
      elevation: 1,
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: textColor,
    },
    footer: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: borderColor,
      backgroundColor,
      gap: 8,
    },
    gateNotice: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
    },
    gateNoticeColor: textSecondary,
    gateNoticeText: {
      fontSize: 13,
      color: textSecondary,
    },
    startButton: {
      backgroundColor: tintColor,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    startButtonPressed: {
      backgroundColor: tintPressed,
    },
    startButtonDisabled: {
      backgroundColor: cardColor,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor,
    },
    startButtonText: {
      fontSize: 17,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    startButtonTextDisabled: {
      color: textSecondary,
    },
    startButtonIconDisabledColor: textSecondary,
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
  content: {
    flex: 1,
    paddingTop: 24,
  },
  startButtonIcon: {
    marginRight: 8,
  },
});
