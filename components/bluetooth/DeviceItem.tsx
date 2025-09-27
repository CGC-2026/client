import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Device } from "react-native-ble-plx";

type DeviceItemProps = {
  device: Device;
  onPress: (device: Device) => void;
  onDisconnect?: () => void;
  isConnecting: boolean;
  isDisabled: boolean;
  isPaired?: boolean;
};

export default function DeviceItem({ 
  device, 
  onPress, 
  onDisconnect,
  isConnecting, 
  isDisabled,
  isPaired = false
}: DeviceItemProps) {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({ light: "#F0F0F0", dark: "#303030" }, "background");
  
  const deviceName = device.name || "Unnamed Device";
  const signalStrength = getSignalStrength(device.rssi);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.deviceItem,
        pressed ? styles.deviceItemPressed : {},
        isPaired ? styles.pairedDeviceItem : {},
        { borderColor },
      ]}
      onPress={() => onPress(device)}
      disabled={isDisabled}
    >
      <View style={styles.deviceIcon}>
        <MaterialIcons 
          name={deviceName.toLowerCase().includes("watch") ? "watch" : "bluetooth"} 
          size={24} 
          color="#4582EC" 
        />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceName, { color: textColor }]}>
          {deviceName}
        </Text>
      </View>
      <View style={styles.deviceStatus}>
        {isConnecting ? (
          <ActivityIndicator size="small" color="#4582EC" />
        ) : (
          <View style={styles.signalContainer}>
            {isPaired ? (
              <View style={styles.connectedStatus}>
                <Text style={styles.connectedText}>Connected</Text>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              </View>
            ) : (
              <>
                {renderSignalIcon(signalStrength)}
                <Text style={styles.rssiValue}>
                  {device.rssi ? `${device.rssi} dBm` : 'N/A'}
                </Text>
              </>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// Generate a signal strength indicator based on RSSI
const getSignalStrength = (rssi?: number | null): number => {
  if (!rssi) return 0;
  // RSSI typically ranges from -100 (weak) to -40 (strong)
  if (rssi > -60) return 3; // Strong
  if (rssi > -80) return 2; // Medium
  if (rssi > -90) return 1; // Weak
  return 0; // Very weak or unknown
};

const renderSignalIcon = (strength: number) => {
  switch (strength) {
    case 3:
      return <Ionicons name="wifi" size={20} color="#4CAF50" />;
    case 2:
      return <Ionicons name="wifi" size={20} color="#FF9800" />;
    case 1:
      return <Ionicons name="wifi" size={20} color="#F44336" />;
    default:
      return <Ionicons name="wifi-outline" size={20} color="#9E9E9E" />;
  }
};

const styles = StyleSheet.create({
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  deviceItemPressed: {
    opacity: 0.8,
    backgroundColor: "rgba(240, 240, 240, 0.9)",
  },
  pairedDeviceItem: {
    backgroundColor: "rgba(236, 246, 253, 0.9)",
    borderColor: "#D0E8F9",
    borderLeftWidth: 3,
    borderLeftColor: "#4582EC",
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(69, 130, 236, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  deviceStatus: {
    marginLeft: 8,
    alignItems: "flex-end",
  },
  signalContainer: {
    alignItems: "center",
  },
  rssiValue: {
    fontSize: 10,
    color: "#9E9E9E",
    marginTop: 2,
  },
  connectedStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectedText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginRight: 4,
  },
  disconnectContainer: {
    marginTop: 8,
  },
});
