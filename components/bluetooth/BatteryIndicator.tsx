import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

interface BatteryIndicatorProps {
  batteryLevel: number; // 0-100
  isCharging?: boolean;
}

export default function BatteryIndicator({
  batteryLevel,
  isCharging = false
}: BatteryIndicatorProps) {
  const textColor = useThemeColor({}, "text");
  const colorScheme = useColorScheme();

  // Determine battery color based on level and charging state
  const getBatteryColor = () => {
    const colors = Colors[colorScheme ?? 'light'];
    if (isCharging) return colors.success;
    if (batteryLevel >= 50) return colors.success;
    if (batteryLevel >= 20) return colors.warning;
    return colors.error;
  };

  const batteryColor = getBatteryColor();

  return (
    <View style={styles.container}>
      <View style={styles.batteryContainer}>
        {/* Battery Icon */}
        <Svg width={40} height={24} viewBox="0 0 40 24" style={styles.batteryIcon}>
          {/* Battery outline */}
          <Rect
            x="2"
            y="6"
            width="32"
            height="12"
            rx="2"
            stroke={batteryColor}
            strokeWidth="2"
            fill="none"
          />

          {/* Battery positive terminal */}
          <Rect
            x="34"
            y="8"
            width="2"
            height="8"
            fill={batteryColor}
          />

          {/* Battery level fill */}
          <Rect
            x="4"
            y="8"
            width={Math.max(0, (batteryLevel / 100) * 28)}
            height="8"
            fill={batteryColor}
          />

          {/* Lightning bolt when charging */}
          {isCharging && (
            <Path
              d="M20 8 L16 12 L18 12 L14 18 L18 16 L16 16 L20 12 Z"
              fill={"#FFFFFF"}
              stroke={"#FFFFFF"}
              strokeWidth="0.5"
            />
          )}
        </Svg>

        {/* Battery text */}
        <View style={styles.batteryText}>
          <Text style={[styles.batteryLevel, { color: textColor }]}>
            {batteryLevel}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryIcon: {
    marginRight: 12,
  },
  batteryText: {
    alignItems: 'flex-start',
  },
  batteryLevel: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
  },
});
