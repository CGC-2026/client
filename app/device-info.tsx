import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import BatteryIndicator from "@/components/bluetooth/BatteryIndicator";
import KneeIcon from "@/components/bluetooth/KneeIcon";
import { useBLE } from "@/contexts/BLE.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

export default function DeviceInfoScreen() {
  const { pairedDevice, disconnectDevice, isConnecting } = useBLE();
  const router = useRouter();
  const errorColor = useThemeColor({}, "error");
  const cardColor = useThemeColor({}, "card");
  const shadowColor = useThemeColor({}, "text");
  const buttonTextColor = useThemeColor({}, "buttonText");
  const backgroundColor = useThemeColor({}, "background");

  // Redirect if no paired device
  useEffect(() => {
    if (!pairedDevice) {
      router.push("/my-devices");
    }
  }, [pairedDevice, router]);

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect Device",
      `Do you want to disconnect from "${pairedDevice?.name || "Unnamed Device"}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            const success = await disconnectDevice();
            if (success) {
              router.push("/my-devices");
            }
          },
        },
      ],
    );
  };

  if (!pairedDevice) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: pairedDevice.name || "Bluetooth Device",
          headerBackTitle: "My Devices",
          headerStyle: {
            backgroundColor,
          },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.headerSection,
            { backgroundColor: cardColor, shadowColor },
          ]}
        >
          <KneeIcon size={75} />
        </View>
        <ThemedView>
          <BatteryIndicator batteryLevel={80} isCharging={true} />
        </ThemedView>
        <Pressable
          style={({ pressed }) => [
            styles.disconnectButton,
            { backgroundColor: pressed ? errorColor : errorColor },
          ]}
          onPress={handleDisconnect}
          disabled={isConnecting}
        >
          <ThemedText
            style={styles.disconnectButtonText}
            lightColor={buttonTextColor}
            darkColor={buttonTextColor}
          >
            {isConnecting ? "Disconnecting..." : "Disconnect Device"}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    marginTop: 30,
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 16,
  },
  disconnectButton: {
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 30,
  },
  disconnectButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
