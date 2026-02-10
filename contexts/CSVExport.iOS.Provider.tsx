import { SensorData } from "@/services/kneeDevice.service";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import { CSVExportContextType } from "./CSVExport.Provider";

const CSVExportContext = createContext<CSVExportContextType | null>(null);

export function IOSCSVExportProvider({ children }: { children: ReactNode }) {
  const [samples, setSamples] = useState<SensorData[]>([]);

  const addSample = useCallback((data: SensorData) => {
    setSamples((prev) => [...prev, data]);
  }, []);

  const clearSamples = useCallback(() => {
    setSamples([]);
  }, []);

  const exportToCSV = useCallback(async () => {
    if (samples.length === 0) {
      Alert.alert("No Data", "No sensor data to export");
      return;
    }

    try {
      // Generate CSV header
      const header = "timestamp,seq,roll,pitch,yaw,flex\n";

      // Generate CSV rows
      const rows = samples
        .map((sample) => {
          return `${sample.timestamp},${sample.seq},${sample.roll.toFixed(2)},${sample.pitch.toFixed(2)},${sample.yaw.toFixed(2)},${sample.flex}`;
        })
        .join("\n");

      const csvContent = header + rows;

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `sensor-data-${timestamp}.csv`;

      // Save to device's document directory
      const fileUri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        // Share the file so user can save it
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export Sensor Data",
          UTI: "public.comma-separated-values-text",
        });

        Alert.alert(
          "Export Successful",
          `Exported ${samples.length} samples to ${filename}`,
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "Export Successful",
          `File saved to:\n${fileUri}\n\n${samples.length} samples exported`,
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("[CSVExport] Export failed:", error);
      Alert.alert(
        "Export Failed",
        `Failed to export data: ${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }],
      );
    }
  }, [samples]);

  return (
    <CSVExportContext.Provider
      value={{
        sampleCount: samples.length,
        addSample,
        exportToCSV,
        clearSamples,
      }}
    >
      {children}
    </CSVExportContext.Provider>
  );
}

/**
 * Hook to access iOS CSV export functionality
 * @returns CSVExportContextType
 * @throws Error if used outside of IOSCSVExportProvider
 */
export function useIOSCSVExport(): CSVExportContextType {
  const context = useContext(CSVExportContext);

  if (!context) {
    throw new Error(
      "useIOSCSVExport must be used within IOSCSVExportProvider",
    );
  }

  return context;
}
