import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type ScanButtonProps = {
  isScanning: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export default function ScanButton({ isScanning, onPress, disabled = false }: ScanButtonProps) {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.scanButton, 
        isScanning ? styles.scanningButton : (pressed ? styles.scanButtonPressed : {}),
        { backgroundColor: isScanning ? "#ff6347" : "#4582EC" }
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {isScanning ? (
        <View style={styles.scanningContent}>
          <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
          <Text style={styles.scanButtonText}>Scanning...</Text>
        </View>
      ) : (
        <View style={styles.scanButtonContent}>
          <Ionicons name="search" size={20} color="#FFFFFF" style={styles.scanIcon} />
          <Text style={styles.scanButtonText}>Scan for Devices</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    backgroundColor: "#4582EC",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  scanButtonPressed: {
    opacity: 0.8,
    backgroundColor: "#3A70C9",
  },
  scanningButton: {
    backgroundColor: "#ff6347",
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
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
