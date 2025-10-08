import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type ScanButtonProps = {
  isScanning: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export default function ScanButton({ isScanning, onPress, disabled = false }: ScanButtonProps) {
  // Get theme colors
  const tintColor = useThemeColor({}, "tint");
  const errorColor = useThemeColor({}, "error");
  const textColor = useThemeColor({ light: "#FFFFFF", dark: "#FFFFFF" }, "text");
  const shadowColor = useThemeColor({ light: "#000000", dark: "#000000" }, "text");

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.scanButton, 
        {
          backgroundColor: isScanning ? errorColor : tintColor,
          shadowColor,
        },
        pressed && { opacity: 0.8 }
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {isScanning ? (
        <View style={styles.scanningContent}>
          <ActivityIndicator color={textColor} style={styles.spinner} />
          <Text style={[styles.scanButtonText, { color: textColor }]}>Scanning...</Text>
        </View>
      ) : (
        <View style={styles.scanButtonContent}>
          <Ionicons name="search" size={20} color={textColor} style={styles.scanIcon} />
          <Text style={[styles.scanButtonText, { color: textColor }]}>Refresh Scan</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  scanButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  scanningContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  scanIcon: {
    marginRight: 8,
  },
  spinner: {
    marginRight: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});