import { ThemedText } from "@/components/ThemedText";
import { SAMPLE_RATES } from "@/constants/BLE";
import { useCalibration } from "@/contexts/Calibration.Provider";
import { useCSVExport } from "@/contexts/CSVExport.Provider";
import { useKneeDevice } from "@/contexts/KneeDevice.Provider";
import { useWorkoutContext } from "@/contexts/Workout.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { SensorData } from "@/types/sensor.types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DevScreen() {
  const {
    device,
    isStreaming,
    isWarmingUp,
    sampleRate,
    startStreaming,
    stopStreaming,
    setSampleRate,
    subscribeSampleData,
    service,
  } = useKneeDevice();

  const [latestSample, setLatestSample] = useState<SensorData | null>(null);

  const { sampleCount, addSample, exportToCSV, clearSamples } = useCSVExport();
  const {
    isSetActive,
    startSet,
    endSet,
    currentRepCount,
    lastRep,
    completedSets,
    cancelSetAndClear,
  } = useWorkoutContext();
  const {
    calibration,
    isCalibrating,
    error: calibrationError,
    loadCalibration,
  } = useCalibration();

  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>("");

  // Subscribe directly to BLE packets — no React render cycle in the hot path
  // null (disconnect signal) is ignored; addSample only accepts SensorData
  useEffect(
    () => subscribeSampleData((data) => { if (data) addSample(data); }),
    [addSample, subscribeSampleData],
  );

  // Separate low-priority subscription just for the display card (drops frames, that's fine)
  useEffect(() => subscribeSampleData(setLatestSample), [subscribeSampleData]);

  const tintColor = useThemeColor({}, "tint");
  const successColor = useThemeColor({}, "success");
  const errorColor = useThemeColor({}, "error");
  const backgroundColor = useThemeColor({}, "background");
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const iconColor = useThemeColor({}, "icon");

  // Now create styles AFTER all hooks
  const styles = createThemedStyles(backgroundColor, cardColor, borderColor);

  const handleToggleStreaming = async () => {
    setIsLoading(true);
    try {
      if (isStreaming) {
        await stopStreaming();
      } else {
        await startStreaming(sampleRate);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleRateChange = (rate: number) => {
    setSampleRate(rate);
  };

  const handleClearData = async () => {
    setLatestSample(null);
    clearSamples();
    setTestResult("");
    await cancelSetAndClear();
  };

  const handleTestRead = async () => {
    setIsLoading(true);
    setTestResult("Reading...");
    try {
      const state = await service.readControlState();
      if (state) {
        setTestResult(
          `Control State: stream=${state.stream}, rate=${state.sampleRate}Hz, mode=${state.mode}`,
        );
      } else {
        setTestResult("Failed to read control state");
      }
    } catch (error) {
      setTestResult(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsLoading(true);
    try {
      await exportToCSV();
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Device Debug</ThemedText>
          <ThemedText style={styles.subtitle}>
            Test and monitor Smart Knee data
          </ThemedText>
        </View>

        {/* Connection Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name={device ? "bluetooth" : "bluetooth-outline"}
              size={24}
              color={device ? successColor : errorColor}
            />
            <ThemedText style={styles.cardTitle}>Connection</ThemedText>
          </View>
          <View style={styles.cardContent}>
            {device ? (
              <>
                <View style={styles.statusRow}>
                  <ThemedText style={styles.label}>Device:</ThemedText>
                  <ThemedText style={styles.value}>
                    {device.name || "Unknown"}
                  </ThemedText>
                </View>
                <View style={styles.statusRow}>
                  <ThemedText style={styles.label}>ID:</ThemedText>
                  <ThemedText style={styles.valueSmall} numberOfLines={1}>
                    {device.id}
                  </ThemedText>
                </View>
                <View style={styles.statusRow}>
                  <ThemedText style={styles.label}>RSSI:</ThemedText>
                  <ThemedText style={styles.value}>
                    {device.rssi ?? "N/A"} dBm
                  </ThemedText>
                </View>
              </>
            ) : (
              <ThemedText style={styles.noDevice}>
                No device connected
              </ThemedText>
            )}
          </View>
        </View>

        {/* Control Panel Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="settings-outline" size={24} color={tintColor} />
            <ThemedText style={styles.cardTitle}>Controls</ThemedText>
          </View>
          <View style={styles.cardContent}>
            {/* Sample Rate Selector */}
            <View style={styles.controlSection}>
              <ThemedText style={styles.label}>Sample Rate (Hz)</ThemedText>
              <View style={styles.sampleRateButtons}>
                {SAMPLE_RATES.map((rate) => (
                  <Pressable
                    key={rate}
                    style={[
                      styles.sampleRateButton,
                      {
                        backgroundColor:
                          sampleRate === rate ? tintColor : "transparent",
                        borderColor: tintColor,
                      },
                    ]}
                    onPress={() => handleSampleRateChange(rate)}
                    disabled={isStreaming}
                  >
                    <ThemedText
                      style={[
                        styles.sampleRateText,
                        {
                          color: sampleRate === rate ? "#fff" : tintColor,
                          opacity: isStreaming ? 0.5 : 1,
                        },
                      ]}
                    >
                      {rate}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Streaming Control */}
            <Pressable
              style={[
                styles.streamButton,
                {
                  backgroundColor: isStreaming ? errorColor : successColor,
                  opacity: !device || isLoading ? 0.5 : 1,
                },
              ]}
              onPress={handleToggleStreaming}
              disabled={!device || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isStreaming ? "stop" : "play"}
                    size={24}
                    color="#fff"
                  />
                  <ThemedText style={styles.streamButtonText}>
                    {isStreaming ? "Stop Streaming" : "Start Streaming"}
                  </ThemedText>
                </>
              )}
            </Pressable>

            {/* Clear Data Button */}
            <Pressable
              style={[styles.clearButton, { borderColor: errorColor }]}
              onPress={handleClearData}
              disabled={!latestSample && !testResult}
            >
              <Ionicons name="trash-outline" size={20} color={errorColor} />
              <ThemedText
                style={[styles.clearButtonText, { color: errorColor }]}
              >
                Clear Data
              </ThemedText>
            </Pressable>

            {/* Test Read Button */}
            <Pressable
              style={[styles.testButton, { borderColor: tintColor }]}
              onPress={handleTestRead}
              disabled={!device || isLoading}
            >
              <Ionicons name="flask-outline" size={20} color={tintColor} />
              <ThemedText style={[styles.testButtonText, { color: tintColor }]}>
                Test Read Characteristic
              </ThemedText>
            </Pressable>

            {/* Export CSV Button */}
            <Pressable
              style={[
                styles.exportButton,
                {
                  borderColor: tintColor,
                  opacity: sampleCount === 0 || isLoading ? 0.5 : 1,
                },
              ]}
              onPress={handleExportCSV}
              disabled={sampleCount === 0 || isLoading}
            >
              <Ionicons name="download-outline" size={20} color={tintColor} />
              <ThemedText
                style={[styles.exportButtonText, { color: tintColor }]}
              >
                Export CSV ({sampleCount} samples)
              </ThemedText>
            </Pressable>

            {/* Test Result */}
            {testResult && (
              <View style={styles.testResult}>
                <ThemedText style={styles.testResultText}>
                  {testResult}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Calibration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="body-outline" size={24} color={tintColor} />
            <ThemedText style={styles.cardTitle}>Calibration</ThemedText>
          </View>
          <View style={styles.cardContent}>
            {calibrationError && (
              <ThemedText style={[styles.calibrationError, { color: errorColor }]}>
                {calibrationError}
              </ThemedText>
            )}
            {calibration ? (
              <View style={styles.dataSection}>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Standing Flexion:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {calibration.standingRollAngle.toFixed(3)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Standing Valgus:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {calibration.standingPitchAngle.toFixed(3)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Standing Rotation:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {calibration.standingYawAngle.toFixed(3)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Updated:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {(() => {
                      const d = new Date(calibration.updatedAt);
                      return isNaN(d.getTime()) ? "—" : d.toLocaleString();
                    })()}
                  </ThemedText>
                </View>
              </View>
            ) : (
              <ThemedText style={styles.noDevice}>No calibration loaded</ThemedText>
            )}
            <Pressable
              style={[styles.testButton, { borderColor: tintColor, opacity: isCalibrating ? 0.5 : 1 }]}
              onPress={loadCalibration}
              disabled={isCalibrating}
            >
              <Ionicons name="refresh-outline" size={20} color={tintColor} />
              <ThemedText style={[styles.testButtonText, { color: tintColor }]}>
                Load Calibration
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Rep Tracking Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="fitness-outline" size={24} color={tintColor} />
            <ThemedText style={styles.cardTitle}>Rep Tracking</ThemedText>
          </View>
          <View style={styles.cardContent}>
            {/* Start / End Set */}
            <Pressable
              style={[
                styles.setButton,
                {
                  backgroundColor: isSetActive ? errorColor : successColor,
                  opacity: !device ? 0.5 : 1,
                },
              ]}
              onPress={isSetActive ? endSet : startSet}
              disabled={!device}
            >
              <Ionicons
                name={isSetActive ? "stop-circle-outline" : "play-circle-outline"}
                size={24}
                color="#fff"
              />
              <ThemedText style={styles.setButtonText}>
                {isSetActive ? "End Set" : "Start Set"}
              </ThemedText>
            </Pressable>

            {!device && (
              <ThemedText style={[styles.repHint, { color: errorColor }]}>
                Connect a device before starting a set
              </ThemedText>
            )}

            {/* Live Rep Count */}
            {isSetActive && (
              <View style={styles.repCountBox}>
                <ThemedText style={[styles.repCountNumber, { color: tintColor }]}>
                  {currentRepCount}
                </ThemedText>
                <ThemedText style={styles.repCountLabel}>
                  {currentRepCount === 1 ? "rep" : "reps"} detected
                </ThemedText>
              </View>
            )}

            {/* Last Rep Metrics */}
            {lastRep && (
              <View style={[styles.dataSection, { marginTop: 16 }]}>
                <ThemedText style={styles.sectionTitle}>
                  Last Rep #{lastRep.repNumber}
                </ThemedText>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Duration:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.durationMs}ms
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Down / Up:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.downMs}ms / {lastRep.metrics.upMs}ms
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Depth:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.rollRomDeg.toFixed(1)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>ROM:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.romDeg.toFixed(1)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Tempo ratio:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.tempoRatio.toFixed(2)}
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Pause at bottom:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.pauseMs}ms
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Flexion max / min:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.maxRollDeg.toFixed(1)}° / {lastRep.metrics.minRollDeg.toFixed(1)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Valgus max / min:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.maxPitchDeg.toFixed(1)}° / {lastRep.metrics.minPitchDeg.toFixed(1)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Valgus ROM:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.pitchRomDeg.toFixed(1)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Peak valgus:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.peakValgus.toFixed(1)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Rotation max / min:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.maxYawDeg.toFixed(1)}° / {lastRep.metrics.minYawDeg.toFixed(1)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Rotation ROM:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.yawRomDeg.toFixed(1)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Peak tibial rotation:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {lastRep.metrics.peakHipRotation.toFixed(1)}°
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Completed Sets History */}
            {completedSets.length > 0 && (
              <View style={[styles.dataSection, { marginTop: 8 }]}>
                <ThemedText style={styles.sectionTitle}>Completed Sets</ThemedText>
                {completedSets.map((set) => (
                  <View
                    key={`set-${set.setNumber}-${set.startTime}`}
                    style={[styles.setHistoryItem, { borderColor }]}
                  >
                    <View style={styles.setHistoryHeader}>
                      <ThemedText style={styles.setHistoryTitle}>
                        Set {set.setNumber}
                      </ThemedText>
                      <ThemedText style={[styles.setHistoryBadge, { backgroundColor: tintColor }]}>
                        {set.reps.length} {set.reps.length === 1 ? "rep" : "reps"}
                      </ThemedText>
                    </View>
                    {set.reps.map((rep) => (
                      <View
                        key={`set-${set.setNumber}-rep-${rep.repNumber}-${rep.startTime}`}
                        style={styles.repHistoryRow}
                      >
                        <ThemedText style={styles.repHistoryIndex}>
                          #{rep.repNumber}
                        </ThemedText>
                        <View style={styles.repHistoryDetails}>
                          <ThemedText style={styles.repHistoryDetail}>
                            {rep.metrics.durationMs}ms · depth {rep.metrics.rollRomDeg.toFixed(1)}°
                          </ThemedText>
                          <ThemedText style={styles.repHistoryDetail}>
                            valgus {rep.metrics.peakValgus.toFixed(1)}° · rotation {rep.metrics.peakHipRotation.toFixed(1)}°
                          </ThemedText>
                          <ThemedText style={styles.repHistoryDetail}>
                            tempo {rep.metrics.tempoRatio.toFixed(2)}x
                          </ThemedText>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Sensor Data Card */}
        {latestSample && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics-outline" size={24} color={tintColor} />
              <ThemedText style={styles.cardTitle}>Sensor Data</ThemedText>
              {isWarmingUp && (
                <ThemedText style={{ fontSize: 12, color: tintColor, fontWeight: "600", marginLeft: "auto" }}>
                  Calibrating...
                </ThemedText>
              )}
            </View>
            <View style={styles.cardContent}>
              {/* Packet Info */}
              <View style={styles.dataSection}>
                <ThemedText style={styles.sectionTitle}>Packet Info</ThemedText>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Sequence:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {latestSample.seq}
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Timestamp:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {formatTimestamp(latestSample.timestamp)}
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Raw (ms):</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {latestSample.timestamp}
                  </ThemedText>
                </View>
              </View>

              {/* Knee Angles */}
              <View style={styles.dataSection}>
                <ThemedText style={styles.sectionTitle}>Knee Angles</ThemedText>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Flexion:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {latestSample.roll.toFixed(2)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Valgus/Varus:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {latestSample.pitch.toFixed(2)}°
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Tibial Rotation:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {latestSample.yaw.toFixed(2)}°
                  </ThemedText>
                </View>
              </View>

              {/* Flex Sensor */}
              <View style={styles.dataSection}>
                <ThemedText style={styles.sectionTitle}>Flex Sensor</ThemedText>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.dataLabel}>Value:</ThemedText>
                  <ThemedText style={styles.dataValue}>
                    {latestSample.flex}
                  </ThemedText>
                </View>
                <View style={styles.flexBar}>
                  <View
                    style={[
                      styles.flexFill,
                      {
                        width: `${(latestSample.flex / 255) * 100}%`,
                        backgroundColor: tintColor,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Raw Hex Data */}
              {latestSample.rawHex && (
                <View style={styles.dataSection}>
                  <ThemedText style={styles.sectionTitle}>
                    Raw Data (Hex)
                  </ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    style={styles.hexScroll}
                  >
                    <ThemedText style={styles.hexText}>
                      {latestSample.rawHex!.match(/.{1,2}/g)?.join(" ") ||
                        latestSample.rawHex}
                    </ThemedText>
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}

        {/* No Data Placeholder */}
        {!latestSample && (
          <View style={styles.card}>
            <View style={styles.emptyState}>
              <Ionicons
                name="pulse-outline"
                size={48}
                color={iconColor}
                style={{ opacity: 0.3 }}
              />
              <ThemedText style={styles.emptyText}>
                No sensor data yet
              </ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Connect a device and start streaming to see data
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createThemedStyles = (
  backgroundColor: string,
  cardColor: string,
  borderColor: string,
) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor,
      marginBottom: 32,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: "700",
      marginBottom: 4,
      padding: 5,
      marginTop: 5,
    },
    subtitle: {
      fontSize: 16,
      opacity: 0.6,
    },
    card: {
      backgroundColor: cardColor,
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
      gap: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
    },
    cardContent: {
      padding: 16,
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
    label: {
      fontSize: 14,
      opacity: 0.7,
      fontWeight: "500",
    },
    value: {
      fontSize: 14,
      fontWeight: "600",
    },
    valueSmall: {
      fontSize: 12,
      fontWeight: "500",
      flex: 1,
      textAlign: "right",
      marginLeft: 8,
    },
    noDevice: {
      textAlign: "center",
      opacity: 0.5,
      fontStyle: "italic",
      paddingVertical: 8,
    },
    controlSection: {
      marginBottom: 16,
    },
    sampleRateButtons: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    sampleRateButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 2,
      alignItems: "center",
    },
    sampleRateText: {
      fontSize: 16,
      fontWeight: "600",
    },
    streamButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      borderRadius: 8,
      gap: 8,
      marginBottom: 12,
    },
    streamButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    clearButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 8,
      borderWidth: 2,
      gap: 8,
    },
    clearButtonText: {
      fontSize: 14,
      fontWeight: "600",
    },
    testButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 8,
      borderWidth: 2,
      gap: 8,
      marginTop: 8,
    },
    testButtonText: {
      fontSize: 14,
      fontWeight: "600",
    },
    exportButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 8,
      borderWidth: 2,
      gap: 8,
      marginTop: 8,
    },
    exportButtonText: {
      fontSize: 14,
      fontWeight: "600",
    },
    testResult: {
      marginTop: 12,
      padding: 12,
      backgroundColor: borderColor,
      borderRadius: 8,
    },
    testResultText: {
      fontSize: 12,
      fontFamily: "SpaceMono",
    },
    dataSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 12,
      opacity: 0.8,
    },
    dataRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
    },
    dataLabel: {
      fontSize: 14,
      opacity: 0.7,
    },
    dataValue: {
      fontSize: 16,
      fontWeight: "600",
      fontFamily: "SpaceMono",
    },
    flexBar: {
      height: 8,
      backgroundColor: borderColor,
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 8,
    },
    flexFill: {
      height: "100%",
      borderRadius: 4,
    },
    hexScroll: {
      backgroundColor: borderColor,
      borderRadius: 6,
      padding: 12,
      marginTop: 8,
    },
    hexText: {
      fontFamily: "SpaceMono",
      fontSize: 12,
      lineHeight: 18,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      opacity: 0.6,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    calibrationError: {
      fontSize: 13,
      marginBottom: 12,
    },
    setButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      borderRadius: 8,
      gap: 8,
      marginBottom: 8,
    },
    setButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    repHint: {
      fontSize: 12,
      textAlign: "center",
      marginBottom: 8,
      opacity: 0.8,
    },
    repCountBox: {
      alignItems: "center",
      paddingVertical: 20,
    },
    repCountNumber: {
      fontSize: 72,
      fontWeight: "800",
      lineHeight: 80,
    },
    repCountLabel: {
      fontSize: 16,
      opacity: 0.6,
      marginTop: 4,
    },
    setHistoryItem: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    setHistoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    setHistoryTitle: {
      fontSize: 15,
      fontWeight: "600",
    },
    setHistoryBadge: {
      fontSize: 12,
      fontWeight: "700",
      color: "#fff",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    repHistoryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 4,
      gap: 8,
    },
    repHistoryIndex: {
      fontSize: 12,
      opacity: 0.5,
      width: 28,
      paddingTop: 1,
    },
    repHistoryDetails: {
      flex: 1,
      gap: 2,
    },
    repHistoryDetail: {
      fontSize: 13,
      fontFamily: "SpaceMono",
      opacity: 0.85,
      flexShrink: 1,
      lineHeight: 18,
    },
  });
};
