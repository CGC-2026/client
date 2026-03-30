import ScreenHeader from "@/components/bluetooth/ScreenHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useCalibration } from "@/contexts/Calibration.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CALIBRATION_DURATION_MS = 1500;

const instructions = [
  {
    icon: "body" as const,
    text: "Put on the knee sleeve and center it evenly over your kneecap, with the sensor positioned on the outside of your knee.",
  },
  {
    icon: "accessibility" as const,
    text: "Stand with your feet shoulder-width apart on a flat, even surface.",
  },
  {
    icon: "arrow-up" as const,
    text: "Stand tall with your back straight and your head looking directly forward.",
  },
  {
    icon: "hand-left" as const,
    text: "Let your arms hang naturally at your sides. Do not hold anything or touch anything.",
  },
];

export default function CalibrationScreen() {
  const router = useRouter();
  const { isCalibrating, calibration, error, startCalibration, clearError } =
    useCalibration();

  const tintColor = useThemeColor({}, "tint");
  const successColor = useThemeColor({}, "success");
  const errorColor = useThemeColor({}, "error");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const backgroundColor = useThemeColor({}, "background");

  const progressAnim = useRef(new Animated.Value(0)).current;
  const calibrationStartedRef = useRef(false);

  // Animate progress bar when calibrating starts
  useEffect(() => {
    if (isCalibrating) {
      calibrationStartedRef.current = true;
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: CALIBRATION_DURATION_MS,
        useNativeDriver: false,
      }).start();
    } else {
      if (!calibrationStartedRef.current) return;
      Animated.timing(progressAnim, {
        toValue: error ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isCalibrating, error]);

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  const styles = createStyles(
    backgroundColor,
    cardColor,
    borderColor,
    textSecondaryColor,
  );

  const showSuccess = !isCalibrating && calibrationStartedRef.current && !error;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="Calibrate Sleeve"
            subtitle="Follow these steps, then hold still while the device calibrates to your standing pose."
          />

          {/* Instructions */}
          <View style={styles.instructionsList}>
            {instructions.map((item, index) => (
              <View key={index} style={styles.instructionItem}>
                <View
                  style={[
                    styles.instructionIcon,
                    { backgroundColor: tintColor },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color="#fff" />
                </View>
                <ThemedText style={styles.instructionText}>
                  {item.text}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View
              style={[styles.progressTrack, { borderColor }]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: showSuccess ? successColor : tintColor,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <ThemedText style={styles.progressLabel}>
              {isCalibrating
                ? "Calibrating device… hold still"
                : showSuccess
                  ? "Calibration complete"
                  : "Press the button below to begin"}
            </ThemedText>
          </View>

          {/* Success card */}
          {showSuccess && (
            <View style={[styles.resultCard, { borderColor: successColor, backgroundColor: cardColor }]}>
              <Ionicons name="checkmark-circle" size={24} color={successColor} />
              <ThemedText style={[styles.resultText, { color: successColor }]}>
                Device calibrated successfully. Angles are now zeroed to your current pose.
              </ThemedText>
            </View>
          )}

          {/* Error card */}
          {error && (
            <View style={[styles.resultCard, { borderColor: errorColor, backgroundColor: cardColor }]}>
              <Ionicons name="alert-circle" size={24} color={errorColor} />
              <View style={styles.resultTextWrapper}>
                <ThemedText style={[styles.resultText, { color: errorColor }]}>
                  {error}
                </ThemedText>
                <Pressable onPress={clearError} style={styles.dismissButton}>
                  <ThemedText style={[styles.dismissText, { color: tintColor }]}>
                    Dismiss
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomActions}>
          {!showSuccess ? (
            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: tintColor,
                  opacity: isCalibrating ? 0.7 : 1,
                },
              ]}
              onPress={startCalibration}
              disabled={isCalibrating}
            >
              {isCalibrating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="radio-button-on" size={20} color="#fff" />
                  <ThemedText style={styles.primaryButtonText}>
                    Start Calibration
                  </ThemedText>
                </>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: successColor }]}
              onPress={handleDone}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <ThemedText style={styles.primaryButtonText}>Done</ThemedText>
            </Pressable>
          )}

          {!showSuccess && (
            <Pressable
              style={styles.secondaryButton}
              onPress={handleDone}
              disabled={isCalibrating}
            >
              <ThemedText
                style={[
                  styles.secondaryButtonText,
                  { color: textSecondaryColor },
                ]}
              >
                Skip for Now
              </ThemedText>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (
  backgroundColor: string,
  cardColor: string,
  borderColor: string,
  textSecondaryColor: string,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor,
    },
    safeArea: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
    },
    instructionsList: {
      gap: 16,
      marginVertical: 32,
    },
    instructionItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 16,
    },
    instructionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 2,
    },
    instructionText: {
      fontSize: 16,
      flex: 1,
      lineHeight: 24,
    },
    progressSection: {
      marginBottom: 20,
      gap: 10,
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: borderColor,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
    },
    progressLabel: {
      fontSize: 14,
      color: textSecondaryColor,
      textAlign: "center",
    },
    resultCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
    },
    resultTextWrapper: {
      flex: 1,
    },
    resultText: {
      fontSize: 15,
      fontWeight: "500",
      flex: 1,
    },
    dismissButton: {
      marginTop: 6,
    },
    dismissText: {
      fontSize: 14,
      fontWeight: "600",
    },
    bottomActions: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      gap: 4,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 12,
    },
    primaryButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: "#fff",
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
    },
    secondaryButtonText: {
      fontSize: 17,
      fontWeight: "600",
    },
  });
