import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type EmptyStateProps = {
  isScanning: boolean;
};

export default function EmptyState({ isScanning }: EmptyStateProps) {
  // Get theme colors
  const textSecondary = useThemeColor({}, "textSecondary");
  const textTertiary = useThemeColor({}, "textTertiary");
  const tintColor = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  
  if (isScanning) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={tintColor} />
        <Text style={[styles.text, { color: textSecondary }]}>
          Searching for devices...
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Ionicons name="bluetooth" size={50} color={iconColor} />
      <Text style={[styles.text, { color: textSecondary }]}>
        No devices found
      </Text>
      <Text style={[styles.subtext, { color: textTertiary }]}>
        Make sure your device is turned on and in range
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 40,
  },
  text: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 16,
  },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  }
});