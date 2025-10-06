import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, Text, View } from "react-native";
import { Device } from "react-native-ble-plx";
import KneeIcon from "./KneeIcon";

interface DeviceInfoHeaderProps {
  device: Device;
}

export default function DeviceInfoHeader({ device }: DeviceInfoHeaderProps) {
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={styles.container}>
      {/* Knee Icon */}
      <View style={styles.iconContainer}>
        <KneeIcon size={80} />
      </View>

      {/* Device Name */}
      <Text style={[styles.deviceName, { color: textColor }]}>
        {device.name || 'Unnamed Device'}
      </Text>

      {/* Connection Status */}
      <Text style={[styles.connectionStatus, { color: textSecondary }]}>
        Connected
      </Text>

      {/* Device ID */}
      <Text style={[styles.deviceId, { color: textSecondary }]}>
        {device.id}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  deviceName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  connectionStatus: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  deviceId: {
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
    opacity: 0.7,
  },
});
