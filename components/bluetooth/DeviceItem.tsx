import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Device } from "react-native-ble-plx";

type DeviceItemProps = {
  device: Device;
  onPress: (device: Device) => void;
  isConnecting: boolean;
  isDisabled: boolean;
  isPaired?: boolean;
};

export default function DeviceItem({ 
  device, 
  onPress, 
  isConnecting, 
  isDisabled,
  isPaired = false
}: DeviceItemProps) {
  // Get theme colors
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const cardColor = useThemeColor({}, "card");
  const cardPressedColor = useThemeColor({}, "cardPressed");
  const cardHighlightedColor = useThemeColor({}, "cardHighlighted");
  const tintColor = useThemeColor({}, "tint");
  const successColor = useThemeColor({}, "success");
  const signalHighColor = useThemeColor({}, "signalStrengthHigh");
  const signalMedColor = useThemeColor({}, "signalStrengthMedium");
  const signalLowColor = useThemeColor({}, "signalStrengthLow");
  
  const deviceName = device.name || "Unnamed Device";
  const signalStrength = getSignalStrength(device.rssi);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.deviceItem,
        { backgroundColor: cardColor, borderColor },
        pressed ? { backgroundColor: cardPressedColor } : {},
        isPaired ? { backgroundColor: cardHighlightedColor } : {},
      ]}
      onPress={() => onPress(device)}
      disabled={isDisabled}
    >
      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceName, { color: textColor }]}>
          {deviceName}
        </Text>
      </View>
      <View style={styles.deviceStatus}>
          <View style={styles.signalContainer}>
            {isPaired ? (
              <View style={styles.connectedStatus}>
                <Text style={[styles.connectedText, { color: successColor }]}>
                  Connected
                </Text>
                <Ionicons name="checkmark-circle" size={16} color={successColor} />
              </View>
            ) : (
              <>
              {isConnecting ? (
              <ActivityIndicator size="small" color={tintColor} />
              ) : (
                <>
                {renderSignalIcon(signalStrength, signalHighColor, signalMedColor, signalLowColor, textSecondary)}
                {/* For testing bring this back if needed */}
                {/* <Text style={[styles.rssiValue, { color: textSecondary }]}>
                  {device.rssi ? `${device.rssi} dBm` : 'N/A'}
                </Text> */}
                </>
                )}
              </>
            )}
          </View>
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

const renderSignalIcon = (
  strength: number,
  highColor: string,
  mediumColor: string,
  lowColor: string,
  defaultColor: string
) => {
  switch (strength) {
    case 3:
      return <Ionicons name="wifi" size={20} color={highColor} />;
    case 2:
      return <Ionicons name="wifi" size={20} color={mediumColor} />;
    case 1:
      return <Ionicons name="wifi" size={20} color={lowColor} />;
    default:
      return <Ionicons name="wifi-outline" size={20} color={defaultColor} />;
  }
};

const styles = StyleSheet.create({
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: "400",
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
    marginTop: 2,
  },
  connectedStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectedText: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 4,
  },
});