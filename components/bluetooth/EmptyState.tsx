import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type EmptyStateProps = {
  isScanning: boolean;
};

export default function EmptyState({ isScanning }: EmptyStateProps) {
  const textColor = useThemeColor({}, "text");
  
  if (isScanning) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4582EC" />
        <Text style={[styles.text, { color: textColor + "AA" }]}>
          Searching for devices...
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Ionicons name="bluetooth" size={50} color="#BBBBBB" />
      <Text style={[styles.text, { color: textColor + "AA" }]}>
        No devices found
      </Text>
      <Text style={[styles.subtext, { color: textColor + "77" }]}>
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
