import { ActiveWorkoutBanner } from "@/components/activities/ActiveWorkoutBanner";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useAuth } from "@/contexts/Auth.Provider";
import { useBLE } from "@/contexts/BLE.Provider";
import { useMenu } from "@/contexts/Menu.Provider";
import { useWorkout } from "@/contexts/Workout.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const menuActions = [
  { id: "profile", title: "Profile", image: "person.fill" },
  { id: "settings", title: "Settings", image: "gear" },
  { id: "signOut", title: "Sign Out", image: "eject" },
];

export default function HomeScreen() {
  const { pairedDevice } = useBLE();
  const router = useRouter();
  const navigation = useNavigation();
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");
  const { createContextMenu } = useMenu();
  const { signOut } = useAuth();
  const workout = useWorkout();

  const handleMenuAction = async (id: string) => {
    if (id === "profile") {
    } else if (id === "settings") {
    } else if (id === "signOut") {
      await signOut();
      router.replace("/sign-in");
    }
  };

  const handleDevicePress = () => {
    router.push("/my-devices");
  };

  const handleQuickStart = () => {
    if (workout.isSessionActive) {
      router.push("/workout-session");
    } else {
      router.push("/workout-type-selector");
    }
  };

  // Calculate recent workout stats
  const totalWorkouts = workout.sessionHistory.length;
  const thisWeekSessions = workout.sessionHistory.filter((s) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return s.startTime >= weekAgo;
  });
  const totalRepsThisWeek = thisWeekSessions.reduce(
    (sum, session) =>
      sum + session.sets.reduce((setSum, set) => setSum + set.reps.length, 0),
    0,
  );

  // Configure the navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => {
        return createContextMenu({
          actions: menuActions,
          onPressAction: handleMenuAction,
          children: (
            <View style={styles.headerButton}>
              <IconSymbol
                name="person.circle.fill"
                color={textColor}
                size={24}
              />
            </View>
          ),
        });
      },
      headerRight: () => (
        <Pressable style={styles.headerButton} onPress={handleDevicePress}>
          <IconSymbol
            name={pairedDevice ? "checkmark.circle.fill" : "circle"}
            size={24}
            color={pairedDevice ? "#4CAF50" : "#ccc"}
          />
        </Pressable>
      ),
    });
  }, [navigation, pairedDevice, textColor]);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ActiveWorkoutBanner />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: textColor }]}>
            Welcome to Knee Sleeve
          </Text>
          <Text style={[styles.subtitle, { color: textColor, opacity: 0.7 }]}>
            {pairedDevice
              ? "Device connected and ready"
              : "Connect your device to get started"}
          </Text>
        </View>

        {/* Quick Start */}
        <ThemedView style={[styles.quickStartCard, { borderColor }]}>
          <View style={styles.quickStartHeader}>
            <IconSymbol
              name="figure.strengthtraining.traditional"
              size={32}
              color={!workout.isDeviceConnected ? "#ccc" : tintColor}
            />
            <View style={styles.quickStartText}>
              <View style={styles.titleWithBadge}>
                <ThemedText style={styles.quickStartTitle}>
                  {!workout.isDeviceConnected
                    ? "Connect Your Device"
                    : workout.isSessionActive
                      ? "Workout Active"
                      : "Ready to Train?"}
                </ThemedText>
                {workout.isSessionActive && (
                  <View style={styles.activeBadge}>
                    <View
                      style={[styles.activeDot, { backgroundColor: "#FF3B30" }]}
                    />
                  </View>
                )}
              </View>
              <ThemedText style={styles.quickStartSubtitle}>
                {!workout.isDeviceConnected
                  ? "Tap the device icon above to connect"
                  : workout.isSessionActive
                    ? "Continue your active workout"
                    : "Start a new workout session"}
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={!workout.isDeviceConnected ? undefined : handleQuickStart}
            disabled={!workout.isDeviceConnected}
            style={({ pressed }) => [
              styles.quickStartButton,
              {
                backgroundColor: !workout.isDeviceConnected
                  ? "#666"
                  : workout.isSessionActive
                    ? "#FF3B30"
                    : tintColor,
                opacity: !workout.isDeviceConnected ? 0.5 : 1,
              },
              pressed && !workout.isDeviceConnected && styles.buttonPressed,
            ]}
          >
            <IconSymbol
              name={
                !workout.isDeviceConnected
                  ? "link.circle"
                  : workout.isSessionActive
                    ? "arrow.right.circle.fill"
                    : "play.fill"
              }
              size={20}
              color="#fff"
            />
            <ThemedText style={styles.quickStartButtonText}>
              {!workout.isDeviceConnected
                ? "Device Required"
                : workout.isSessionActive
                  ? "Continue Workout"
                  : "Quick Start"}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Stats */}
        {totalWorkouts > 0 && (
          <ThemedView style={[styles.statsCard, { borderColor }]}>
            <ThemedText style={styles.statsTitle}>Your Progress</ThemedText>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: tintColor }]}>
                  {totalWorkouts.toString()}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Total Workouts</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: tintColor }]}>
                  {thisWeekSessions.length.toString()}
                </ThemedText>
                <ThemedText style={styles.statLabel}>This Week</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: tintColor }]}>
                  {totalRepsThisWeek.toString()}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Reps This Week</ThemedText>
              </View>
            </View>
          </ThemedView>
        )}

        {/* Connection Status */}
        {!pairedDevice && (
          <ThemedView style={[styles.connectionCard, { borderColor }]}>
            <IconSymbol
              name="exclamationmark.circle"
              size={32}
              color="#FFA726"
            />
            <ThemedText style={styles.connectionTitle}>
              No Device Connected
            </ThemedText>
            <ThemedText style={styles.connectionText}>
              Connect your knee sleeve to start tracking your workouts
            </ThemedText>
            <Pressable
              onPress={handleDevicePress}
              style={({ pressed }) => [
                styles.connectButton,
                { backgroundColor: tintColor },
                pressed && styles.buttonPressed,
              ]}
            >
              <ThemedText style={styles.connectButtonText}>
                Connect Device
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  quickStartCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  quickStartHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  quickStartText: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickStartTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickStartSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  quickStartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  quickStartButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  statsCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
    fontVariant: ["tabular-nums"],
    lineHeight: 40, // Increased line height to prevent cutoff
    paddingTop: 4, // Add padding to ensure top isn't clipped
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: "center",
  },
  connectionCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  connectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  connectionText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  connectButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.7,
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
  },
});
