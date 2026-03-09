import ActiveRepCounter from "@/components/workout/ActiveRepCounter";
import CompletedSetRow from "@/components/workout/CompletedSetRow";
import { ThemedView } from "@/components/ThemedView";
import { useWorkoutContext } from "@/contexts/Workout.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ActiveWorkoutScreen() {
  const { workoutTypeName } = useLocalSearchParams<{
    workoutTypeId: string;
    workoutTypeName: string;
  }>();

  const {
    isSetActive,
    currentSetNumber,
    currentRepCount,
    completedSets,
    startSet,
    endSet,
    endSession,
    setError,
  } = useWorkoutContext();

  const navigation = useNavigation();
  const router = useRouter();
  const themedStyles = createThemedStyles();
  const [isEnding, setIsEnding] = useState(false);

  const handleEndWorkout = useCallback(() => {
    if (isSetActive) return;

    Alert.alert(
      "End Workout",
      "Are you sure you want to end this workout session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Workout",
          style: "destructive",
          onPress: async () => {
            setIsEnding(true);
            try {
              await endSession();
              router.replace("/");
            } finally {
              setIsEnding(false);
            }
          },
        },
      ],
    );
  }, [isSetActive, endSession, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerLeft: () => (
        <Text style={themedStyles.headerTitle} numberOfLines={1}>
          {workoutTypeName ?? "Workout"}
        </Text>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleEndWorkout}
          disabled={isSetActive || isEnding}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[
              themedStyles.endWorkoutText,
              (isSetActive || isEnding) && themedStyles.endWorkoutTextDisabled,
            ]}
          >
            End Workout
          </Text>
        </Pressable>
      ),
      headerTitle: "",
      headerTransparent: false,
    });
  }, [navigation, workoutTypeName, handleEndWorkout, isSetActive, isEnding, themedStyles]);

  const nextSetNumber = currentSetNumber + 1;

  return (
    <ThemedView style={styles.container}>
      {setError ? (
        <View style={themedStyles.errorBanner}>
          <Ionicons
            name="warning"
            size={18}
            color={themedStyles.errorColor}
            style={styles.bannerIcon}
          />
          <Text style={themedStyles.errorText}>{setError}</Text>
        </View>
      ) : null}

      <View style={styles.mainArea}>
        {isSetActive ? (
          // Set active: show live rep counter
          <View style={styles.activeSetArea}>
            <Text style={themedStyles.setLabel}>Set {nextSetNumber}</Text>
            <ActiveRepCounter count={currentRepCount} />
            <Pressable
              onPress={endSet}
              style={({ pressed }) => [
                themedStyles.primaryButton,
                pressed && themedStyles.primaryButtonPressed,
              ]}
            >
              <Ionicons
                name="stop-circle"
                size={20}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.primaryButtonText}>End Set</Text>
            </Pressable>
          </View>
        ) : (
          // Idle: prompt to start the next set
          <View style={styles.idleArea}>
            <Text style={themedStyles.setReadyLabel}>
              Set {nextSetNumber} Ready
            </Text>
            <Text style={themedStyles.setReadySubLabel}>
              Position yourself and start when ready
            </Text>
            <Pressable
              onPress={startSet}
              style={({ pressed }) => [
                themedStyles.primaryButton,
                pressed && themedStyles.primaryButtonPressed,
              ]}
            >
              <Ionicons
                name="play-circle"
                size={20}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.primaryButtonText}>Start Set</Text>
            </Pressable>
          </View>
        )}
      </View>

      {completedSets.length > 0 ? (
        <ScrollView
          style={styles.setsScrollView}
          contentContainerStyle={styles.setsContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={themedStyles.sectionHeader}>Completed Sets</Text>
          <View style={themedStyles.setsCard}>
            {completedSets.map((set, index) => (
              <CompletedSetRow
                key={set.setNumber}
                setNumber={set.setNumber}
                repCount={set.reps.length}
                isLast={index === completedSets.length - 1}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}
    </ThemedView>
  );
}

const createThemedStyles = () => {
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tintColor = useThemeColor({}, "tint");
  const errorColor = useThemeColor({}, "error");
  const cardColor = useThemeColor({}, "card");
  const errorBgColor = useThemeColor(
    { light: "#FFF0ED", dark: "#2A1A18" },
    "background",
  );
  const buttonPressedColor = useThemeColor(
    { light: "#005CC5", dark: "#4A7AE0" },
    "tint",
  );

  return {
    headerTitle: {
      fontSize: 17,
      fontWeight: "600" as const,
      color: textColor,
      maxWidth: 200,
    },
    endWorkoutText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: errorColor,
    },
    endWorkoutTextDisabled: {
      opacity: 0.4,
    },
    setLabel: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: textSecondary,
      textAlign: "center" as const,
      marginBottom: 24,
      letterSpacing: 0.5,
      textTransform: "uppercase" as const,
    },
    setReadyLabel: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: textColor,
      textAlign: "center" as const,
      marginBottom: 8,
    },
    setReadySubLabel: {
      fontSize: 15,
      color: textSecondary,
      textAlign: "center" as const,
      marginBottom: 48,
      lineHeight: 22,
    },
    primaryButton: {
      backgroundColor: tintColor,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 16,
      paddingHorizontal: 40,
      borderRadius: 14,
      gap: 8,
      marginTop: 8,
    },
    primaryButtonPressed: {
      backgroundColor: buttonPressedColor,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: textSecondary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    setsCard: {
      backgroundColor: cardColor,
      borderRadius: 12,
      overflow: "hidden" as const,
    },
    errorBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: errorBgColor,
      borderRadius: 10,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 8,
    },
    errorColor,
    errorText: {
      flex: 1,
      fontSize: 13,
      color: errorColor,
      lineHeight: 18,
    },
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  mainArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  idleArea: {
    alignItems: "center",
    width: "100%",
  },
  activeSetArea: {
    alignItems: "center",
    width: "100%",
  },
  setsScrollView: {
    maxHeight: 280,
  },
  setsContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  headerButtonPressed: {
    opacity: 0.6,
  },
  bannerIcon: {
    flexShrink: 0,
  },
  buttonIcon: {
    flexShrink: 0,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
