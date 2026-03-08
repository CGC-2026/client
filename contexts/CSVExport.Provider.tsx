import type { SensorData } from "@/types/sensor.types";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import {
  IOSCSVExportProvider,
  useIOSCSVExport,
} from "./CSVExport.iOS.Provider";

// Public API shape for CSV export
export type CSVExportContextType = {
  /** Number of samples collected */
  sampleCount: number;
  /** Add a sensor data sample to the collection */
  addSample: (data: SensorData) => void;
  /** Export collected samples to CSV file */
  exportToCSV: () => Promise<void>;
  /** Clear all collected samples */
  clearSamples: () => void;
};

export function CSVExportProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === "ios") {
    return <IOSCSVExportProvider>{children}</IOSCSVExportProvider>;
  } else {
    return <>{children}</>;
  }
}

export default CSVExportProvider;

/**
 * Hook to access CSV export functionality
 * @returns CSVExportContextType
 * @throws Error if used outside of CSVExportProvider or on unsupported platform
 */
export const useCSVExport = (): CSVExportContextType => {
  const iosContext = useIOSCSVExport();

  if (Platform.OS !== "ios") {
    throw new Error("CSVExportProvider is not supported on this platform");
  }

  return iosContext;
};
