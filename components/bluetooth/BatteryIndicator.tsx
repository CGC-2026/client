import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Battery } from "@brightlayer-ui/react-native-progress-icons";
import { StyleSheet, Text, View } from "react-native";

interface BatteryIndicatorProps {
  batteryLevel: number; // 0-100
  isCharging?: boolean;
}

export default function BatteryIndicator({
  batteryLevel,
  isCharging = false,
}: BatteryIndicatorProps) {
  const textColor = useThemeColor({}, "text");
  const colorScheme = useColorScheme();

  // Determine battery color based on level and charging state
  const getBatteryColor = () => {
    const colors = Colors[colorScheme ?? "light"];
    if (isCharging) return colors.success;
    if (batteryLevel >= 50) return colors.success;
    if (batteryLevel >= 20) return colors.warning;
    return colors.error;
  };

  const batteryColor = getBatteryColor();

  return (
    <View>
      <View style={styles.batteryContainer}>
        {/* Battery Icon */}
        <Battery
          percent={batteryLevel}
          size={48}
          color={batteryColor}
          charging={isCharging}
        />
        {/* Battery text */}
        <View>
          <Text style={[styles.batteryLevel, { color: textColor }]}>
            {batteryLevel}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  batteryContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  batteryLevel: {
    fontSize: 20,
    fontWeight: "500",
  },
});
