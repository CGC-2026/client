import DeviceItem from "@/components/bluetooth/DeviceItem";
import EmptyState from "@/components/bluetooth/EmptyState";
import ScanButton from "@/components/bluetooth/ScanButton";
import ScreenHeader from "@/components/bluetooth/ScreenHeader";
import SectionHeader from "@/components/bluetooth/SectionHeader";
import { ThemedView } from "@/components/ThemedView";
import { ble } from "@/constants/BLE";
import { useBLE } from "@/contexts/BLE.Provider";
import { useStorage } from "@/contexts/Storage.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Device } from "react-native-ble-plx";

export default function BluetoothScreen() {
  const {
    findDevices,
    stopScan,
    pairDevice,
    disconnectDevice,
    devices,
    pairedDevice,
    isScanning,
    isConnecting,
    connectingDeviceId,
  } = useBLE();
  const [, setLastDeviceId] = useStorage("ble.lastDeviceId");

  const router = useRouter();
  const themedStyles = createThemedStyles();

  useEffect(() => {
    // scan for devices on first render
    findDevices({ serviceUUIDs: [ble.smartKneeServiceUUID] });
  }, []);

  const handleDevicePress = async (device: Device) => {
    if (isConnecting) {
      // disconnect the device
      await disconnectDevice();
    }
    const success = await pairDevice(device, {
      bondingServiceUUID: ble.smartKneeServiceUUID,
    });
    if (success) {
      // Save paired device ID to storage for auto-reconnection
      await setLastDeviceId(device.id);
      // Go back to My Devices screen
      router.back();
    }
  };

  return (
    <ThemedView style={themedStyles.container}>
      <Stack.Screen
        options={{
          title: "",
          headerBackTitle: "My Devices",
          headerStyle: {
            backgroundColor: useThemeColor({}, "background"),
          },
          headerShadowVisible: false,
        }}
      />
      <View style={themedStyles.contentContainer}>
        <View style={themedStyles.headerContainer}>
          <ScreenHeader title="Devices" subtitle="Connect to your device" />
          <ScanButton
            isScanning={isScanning}
            onPress={isScanning ? stopScan : () => findDevices({ serviceUUIDs: [ble.smartKneeServiceUUID] })
          }
            disabled={isConnecting}
          />
        </View>

        <ScrollView contentContainerStyle={themedStyles.scrollContent}>
          {/* Available Devices Section */}
          {devices.length > 0 && (
            <View style={themedStyles.section}>
              <SectionHeader title="Available" />
              {devices.map((device) =>
                // Skip if this is the paired device
                pairedDevice?.id === device.id ? null : (
                  <DeviceItem
                    key={device.id}
                    device={device}
                    onPress={handleDevicePress}
                    isConnecting={
                      connectingDeviceId === device.id && isConnecting
                    }
                    isDisabled={isConnecting}
                  />
                ),
              )}
            </View>
          )}

          {/* Empty State */}
          {devices.length === 0 && !pairedDevice && (
            <EmptyState isScanning={isScanning} />
          )}
        </ScrollView>
      </View>
    </ThemedView>
  );
}

// A function that creates styles with theme-aware colors
export const createThemedStyles = () => {
  const backgroundColor = useThemeColor({}, "background");
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const shadowColor = useThemeColor(
    { light: "#000000", dark: "#000000" },
    "text",
  );

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor,
      paddingTop: 8,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: borderColor,
      marginVertical: 8,
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 0,
    },
    headerContainer: {
      paddingHorizontal: 16,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 24,
    },
    section: {
      marginTop: 24,
      backgroundColor: cardColor,
      borderRadius: 10,
      marginHorizontal: 16,
      overflow: "hidden",
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2.5,
      elevation: 1,
    },
  });
};
