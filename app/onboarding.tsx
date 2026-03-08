import DeviceItem from "@/components/bluetooth/DeviceItem";
import EmptyState from "@/components/bluetooth/EmptyState";
import KneeIcon from "@/components/bluetooth/KneeIcon";
import ScanButton from "@/components/bluetooth/ScanButton";
import ScreenHeader from "@/components/bluetooth/ScreenHeader";
import SectionHeader from "@/components/bluetooth/SectionHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ble } from "@/constants/BLE";
import { useBLE } from "@/contexts/BLE.Provider";
import { useCalibration } from "@/contexts/Calibration.Provider";
import { useStorage } from "@/contexts/Storage.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Device } from "react-native-ble-plx";
import { SafeAreaView } from "react-native-safe-area-context";

type OnboardingStep = "welcome" | "scanning" | "success" | "calibration";

const CALIBRATION_DURATION_MS = 4000;

const calibrationInstructions = [
  {
    icon: "body" as const,
    text: "Center the sleeve evenly over your kneecap with the sensor on the outside of your knee.",
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
    text: "Let your arms hang naturally at your sides. Do not hold anything.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [, setOnboardingComplete] = useStorage("ble.onboardingComplete");
  const [, setLastDeviceId] = useStorage("ble.lastDeviceId");

  const {
    findDevices,
    stopScan,
    pairDevice,
    devices,
    isScanning,
    isConnecting,
    connectingDeviceId,
    pairedDevice,
  } = useBLE();

  const {
    isCalibrating,
    calibration: savedCalibration,
    error: calibrationError,
    startCalibration,
    clearError: clearCalibrationError,
  } = useCalibration();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const calibrationStartedRef = useRef(false);

  // Animate progress bar while calibrating
  useEffect(() => {
    if (isCalibrating) {
      calibrationStartedRef.current = true;
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: CALIBRATION_DURATION_MS,
        useNativeDriver: false,
      }).start();
    }
  }, [isCalibrating]);

  // Auto-advance after successful calibration in the onboarding step
  useEffect(() => {
    if (
      step === "calibration" &&
      !isCalibrating &&
      savedCalibration &&
      calibrationStartedRef.current
    ) {
      const timer = setTimeout(() => {
        handleComplete();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [step, isCalibrating, savedCalibration]);

  const styles = createThemedStyles();
  const tintColor = useThemeColor({}, "tint");
  const successColor = useThemeColor({}, "success");
  const errorColor = useThemeColor({}, "error");
  const textSecondaryColor = useThemeColor({}, "textSecondary");

  // Start scanning when entering the scanning step
  useEffect(() => {
    if (step === "scanning") {
      findDevices({ serviceUUIDs: [ble.smartKneeServiceUUID] });
    }
    return () => {
      if (step === "scanning") {
        stopScan();
      }
    };
  }, [step]);

  // Move to success when device is paired
  useEffect(() => {
    if (pairedDevice && step === "scanning") {
      setStep("success");
    }
  }, [pairedDevice, step]);

  const handleGetStarted = useCallback(() => {
    setStep("scanning");
  }, []);

  const handleDevicePress = useCallback(
    async (device: Device) => {
      const success = await pairDevice(device, {
        bondingServiceUUID: ble.smartKneeServiceUUID,
      });
      if (success) {
        // Save paired device ID for auto-reconnection
        await setLastDeviceId(device.id);
      }
    },
    [pairDevice, setLastDeviceId],
  );

  const handleComplete = useCallback(async () => {
    await setOnboardingComplete(true);
    router.replace("/(tabs)");
  }, [setOnboardingComplete, router]);

  const handleRescan = useCallback(() => {
    findDevices({ serviceUUIDs: [ble.smartKneeServiceUUID] });
  }, [findDevices]);

  const handleSkip = useCallback(async () => {
    stopScan();
    await setOnboardingComplete(true);
    router.replace("/(tabs)");
  }, [stopScan, setOnboardingComplete, router]);

  // Welcome Step
  if (step === "welcome") {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.welcomeContent}>
            <View style={styles.iconContainer}>
              <KneeIcon size={120} />
            </View>

            <ThemedText style={styles.welcomeTitle}>
              Connect Your Smart Knee Sleeve
            </ThemedText>

            <ThemedText style={styles.welcomeDescription}>
              Let's get your device set up. Make sure your Smart Knee Sleeve is
              turned on and nearby.
            </ThemedText>
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <View
                  style={[
                    styles.instructionIcon,
                    { backgroundColor: tintColor },
                  ]}
                >
                  <Ionicons name="bluetooth" size={20} color="#fff" />
                </View>
                <ThemedText style={styles.instructionText}>
                  Turn on your knee sleeve by pressing the power button.
                </ThemedText>
              </View>

              <View style={styles.instructionItem}>
                <View
                  style={[
                    styles.instructionIcon,
                    { backgroundColor: tintColor },
                  ]}
                >
                  <Ionicons name="power" size={20} color="#fff" />
                </View>
                <ThemedText style={styles.instructionText}>
                  Turn on Bluetooth by holding the power button for 4 seconds. The LED
                  should start blinking blue (fast).
                </ThemedText>
              </View>
              
              <View style={styles.instructionItem}>
                <View
                  style={[
                    styles.instructionIcon,
                    { backgroundColor: tintColor },
                  ]}
                >
                  <Ionicons name="locate" size={20} color="#fff" />
                </View>
                <ThemedText style={styles.instructionText}>
                  Keep the device within 3 meters
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.bottomActions}>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: tintColor }]}
              onPress={handleGetStarted}
            >
              <ThemedText style={styles.primaryButtonText}>
                Get Started
              </ThemedText>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Scanning Step
  if (step === "scanning") {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "",
            headerBackTitle: "Back",
            headerStyle: {
              backgroundColor: StyleSheet.flatten(styles.container)
                .backgroundColor,
            },
            headerShadowVisible: false,
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
          <View style={styles.scanningContent}>
            <ScreenHeader
              title="Find Your Device"
              subtitle="Select your Smart Knee Sleeve from the list below"
            />

            <ScanButton
              isScanning={isScanning}
              onPress={isScanning ? stopScan : handleRescan}
              disabled={isConnecting}
            />

            <ScrollView
              style={styles.deviceList}
              contentContainerStyle={styles.deviceListContent}
            >
              {devices.length > 0 ? (
                <View style={styles.devicesSection}>
                  <SectionHeader title="Available Devices" />
                  {devices.map((device) => (
                    <DeviceItem
                      key={device.id}
                      device={device}
                      onPress={handleDevicePress}
                      isConnecting={
                        connectingDeviceId === device.id && isConnecting
                      }
                      isDisabled={isConnecting}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  isScanning={isScanning}
                  message="No Smart Knee Sleeves found"
                  subMessage="Make sure your device is turned on and in range, then try scanning again"
                />
              )}
            </ScrollView>
          </View>

          <View style={styles.bottomActions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={handleSkip}
              disabled={isConnecting}
            >
              <ThemedText style={styles.secondaryButtonText}>
                Skip for Now
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Success Step
  if (step === "success") {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.successContent}>
            <View
              style={[
                styles.successIconContainer,
                { backgroundColor: successColor },
              ]}
            >
              <Ionicons name="checkmark" size={60} color="#fff" />
            </View>

            <ThemedText style={styles.successTitle}>You're All Set!</ThemedText>

            <ThemedText style={styles.successDescription}>
              Your Smart Knee Sleeve is now connected and ready to use.
            </ThemedText>

            {pairedDevice && (
              <View style={styles.connectedDeviceCard}>
                <View style={styles.connectedDeviceInfo}>
                  <KneeIcon size={40} />
                  <View style={styles.connectedDeviceText}>
                    <ThemedText style={styles.connectedDeviceName}>
                      {pairedDevice.name || "Smart Knee Sleeve"}
                    </ThemedText>
                    <View style={styles.connectedStatus}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: successColor },
                        ]}
                      />
                      <ThemedText style={styles.connectedStatusText}>
                        Connected
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={styles.bottomActions}>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: tintColor }]}
              onPress={() => setStep("calibration")}
            >
              <ThemedText style={styles.primaryButtonText}>
                Set Up Calibration
              </ThemedText>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleComplete}>
              <ThemedText style={styles.secondaryButtonText}>
                Skip for Now
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Calibration Step
  if (step === "calibration") {
    const showCalibrationSuccess =
      !isCalibrating &&
      savedCalibration &&
      calibrationStartedRef.current;

    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "",
            headerBackTitle: "Back",
            headerStyle: {
              backgroundColor: StyleSheet.flatten(styles.container)
                .backgroundColor,
            },
            headerShadowVisible: false,
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
          <ScrollView
            style={styles.calibrationScroll}
            contentContainerStyle={styles.calibrationScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ScreenHeader
              title="Calibrate Sleeve"
              subtitle="Follow these steps, then hold still for 4 seconds while we record your standing baseline."
            />

            <View style={styles.instructionsList}>
              {calibrationInstructions.map((item, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View
                    style={[
                      styles.instructionIcon,
                      { backgroundColor: tintColor },
                    ]}
                  >
                    <Ionicons name={item.icon} size={20} color="#fff" />
                  </View>
                  <ThemedText style={styles.calibrationInstructionText}>
                    {item.text}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Progress bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: showCalibrationSuccess
                        ? successColor
                        : tintColor,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
              <ThemedText style={[styles.progressLabel, { color: textSecondaryColor }]}>
                {isCalibrating
                  ? "Recording… hold still"
                  : showCalibrationSuccess
                    ? "Calibration saved — continuing…"
                    : "Press the button below to begin"}
              </ThemedText>
            </View>

            {/* Success card */}
            {showCalibrationSuccess && (
              <View style={styles.calibrationResultCard}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={successColor}
                />
                <ThemedText
                  style={[styles.calibrationResultText, { color: successColor }]}
                >
                  Standing baseline recorded successfully.
                </ThemedText>
              </View>
            )}

            {/* Error card */}
            {calibrationError && (
              <View style={styles.calibrationResultCard}>
                <Ionicons name="alert-circle" size={24} color={errorColor} />
                <View style={styles.calibrationResultTextWrapper}>
                  <ThemedText
                    style={[
                      styles.calibrationResultText,
                      { color: errorColor },
                    ]}
                  >
                    {calibrationError}
                  </ThemedText>
                  <Pressable
                    onPress={clearCalibrationError}
                    style={styles.calibrationDismissButton}
                  >
                    <ThemedText
                      style={[
                        styles.calibrationDismissText,
                        { color: tintColor },
                      ]}
                    >
                      Dismiss
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.bottomActions}>
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
            <Pressable
              style={styles.secondaryButton}
              onPress={handleComplete}
              disabled={isCalibrating}
            >
              <ThemedText style={styles.secondaryButtonText}>
                Skip for Now
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return null;
}

const createThemedStyles = () => {
  const backgroundColor = useThemeColor({}, "background");
  const cardColor = useThemeColor({}, "card");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor,
    },
    safeArea: {
      flex: 1,
    },
    // Welcome Step Styles
    welcomeContent: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      alignItems: "center",
    },
    iconContainer: {
      marginBottom: 32,
    },
    welcomeTitle: {
      fontSize: 28,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 16,
      padding: 5,
    },
    welcomeDescription: {
      fontSize: 16,
      color: textSecondaryColor,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 40,
      paddingHorizontal: 16,
    },
    instructionsList: {
      width: "100%",
      gap: 16,
    },
    instructionItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    instructionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    instructionText: {
      fontSize: 16,
      flex: 1,
    },
    // Scanning Step Styles
    scanningContent: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    deviceList: {
      flex: 1,
      marginTop: 16,
    },
    deviceListContent: {
      flexGrow: 1,
      paddingBottom: 24,
    },
    devicesSection: {
      backgroundColor: cardColor,
      borderRadius: 10,
      overflow: "hidden",
    },
    // Success Step Styles
    successContent: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 80,
      alignItems: "center",
    },
    successIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 32,
    },
    successTitle: {
      fontSize: 28,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 16,
      padding: 5,
    },
    successDescription: {
      fontSize: 16,
      color: textSecondaryColor,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 40,
      paddingHorizontal: 16,
    },
    connectedDeviceCard: {
      backgroundColor: cardColor,
      borderRadius: 12,
      padding: 16,
      width: "100%",
      borderWidth: 1,
      borderColor,
    },
    connectedDeviceInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    connectedDeviceText: {
      flex: 1,
    },
    connectedDeviceName: {
      fontSize: 17,
      fontWeight: "600",
      marginBottom: 4,
    },
    connectedStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    connectedStatusText: {
      fontSize: 14,
      color: textSecondaryColor,
    },
    // Bottom Actions
    bottomActions: {
      paddingHorizontal: 24,
      paddingBottom: 16,
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
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: "transparent",
    },
    secondaryButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: textSecondaryColor,
    },
    // Calibration Step Styles
    calibrationScroll: {
      flex: 1,
    },
    calibrationScrollContent: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 16,
    },
    calibrationInstructionText: {
      fontSize: 16,
      flex: 1,
      lineHeight: 24,
    },
    progressSection: {
      marginTop: 8,
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
      textAlign: "center",
    },
    calibrationResultCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor,
      backgroundColor: cardColor,
      marginBottom: 16,
    },
    calibrationResultTextWrapper: {
      flex: 1,
    },
    calibrationResultText: {
      fontSize: 15,
      fontWeight: "500",
      flex: 1,
    },
    calibrationDismissButton: {
      marginTop: 6,
    },
    calibrationDismissText: {
      fontSize: 14,
      fontWeight: "600",
    },
  });
};
