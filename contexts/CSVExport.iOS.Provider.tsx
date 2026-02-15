import { SensorData } from "@/services/kneeDevice.service";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import { CSVExportContextType } from "./CSVExport.Provider";

const CSVExportContext = createContext<CSVExportContextType | null>(null);

// Stripped-down sample type for CSV export (no rawHex to save memory)
type CSVSample = Omit<SensorData, "rawHex">;

// Configuration
const MAX_SAMPLES = 1_000_000; // Cap at 1M samples (~40MB at 120Hz = ~2.3 hours)
const THROTTLE_UPDATE_MS = 250; // Update UI count every 250ms

export function IOSCSVExportProvider({ children }: { children: ReactNode }) {
  // Use ref to avoid re-renders on every sample
  const samplesRef = useRef<CSVSample[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Track count in state for UI updates, but throttle them
  const [sampleCount, setSampleCount] = useState<number>(0);

  const addSample = useCallback((data: SensorData) => {
    // Strip rawHex to save memory - we don't export it anyway
    const { rawHex, ...csvData } = data;
    
    // Push directly to ref (no array spread, no state update)
    samplesRef.current.push(csvData);
    
    // Implement ring buffer: drop oldest samples if over limit
    if (samplesRef.current.length > MAX_SAMPLES) {
      samplesRef.current.shift();
    }
    
    // Throttle UI updates to avoid constant re-renders
    const now = Date.now();
    if (now - lastUpdateTimeRef.current >= THROTTLE_UPDATE_MS) {
      lastUpdateTimeRef.current = now;
      setSampleCount(samplesRef.current.length);
    }
  }, []);

  const clearSamples = useCallback(() => {
    samplesRef.current = [];
    setSampleCount(0);
    lastUpdateTimeRef.current = 0;
  }, []);

  const exportToCSV = useCallback(async () => {
    // Snapshot the current samples at export time
    const currentSamples = samplesRef.current;
    
    if (currentSamples.length === 0) {
      Alert.alert("No Data", "No sensor data to export");
      return;
    }

    try {
      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `sensor-data-${timestamp}.csv`;

      // Save to device's document directory
      const fileUri = FileSystem.documentDirectory + filename;

      // Build CSV in chunks to avoid one giant string concatenation
      const CHUNK_SIZE = 10000; // Process 10k samples at a time
      const chunks: string[] = [];
      
      // Add header
      chunks.push("timestamp,seq,roll,pitch,yaw,flex");

      // Generate CSV rows in chunks
      for (let i = 0; i < currentSamples.length; i += CHUNK_SIZE) {
        const chunkSamples = currentSamples.slice(i, i + CHUNK_SIZE);
        const rows = chunkSamples
          .map((sample) => 
            `${sample.timestamp},${sample.seq},${sample.roll.toFixed(2)},${sample.pitch.toFixed(2)},${sample.yaw.toFixed(2)},${sample.flex}`
          )
          .join("\n");
        chunks.push(rows);
      }

      // Join all chunks with newlines
      const csvContent = chunks.join("\n");

      // Write to file
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
      } else {
        Alert.alert(
          "Export Successful",
          `File saved to:\n${fileUri}\n\n${currentSamples.length} samples exported`,
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
  }, []);

  return (
    <CSVExportContext.Provider
      value={{
        sampleCount,
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
    throw new Error("useIOSCSVExport must be used within IOSCSVExportProvider");
  }

  return context;
}
