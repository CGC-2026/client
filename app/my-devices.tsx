import { ThemedText } from "@/components/ThemedText";
import DeviceItem from "@/components/bluetooth/DeviceItem";
import EmptyState from "@/components/bluetooth/EmptyState";
import ScreenHeader from "@/components/bluetooth/ScreenHeader";
import { useBLE } from "@/contexts/BLE.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Device } from "react-native-ble-plx";

// Type for saved devices
interface SavedDevice {
  id: string;
  name: string;
  lastConnected?: Date;
}

export default function MyDevicesScreen() {
  const { pairedDevice } = useBLE();
  const router = useRouter();
  const themedStyles = createThemedStyles();
  const buttonColor = useThemeColor({}, "tint");
  const buttonTextColor = useThemeColor({}, "background");
  
  // Mock saved devices - would come from AsyncStorage or API in production
  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);

  // Effect to fetch saved devices (mock implementation)
  useEffect(() => {
    // Mock implementation - this would be replaced with actual AsyncStorage/API call
    // For now, we just check if there's a paired device and add it to saved devices if needed
    if (pairedDevice && !savedDevices.some(device => device.id === pairedDevice.id)) {
      setSavedDevices(prevDevices => [
        ...prevDevices,
        {
          id: pairedDevice.id,
          name: pairedDevice.name || 'Unnamed Device',
          lastConnected: new Date()
        }
      ]);
    }
  }, [pairedDevice]);

  const handleDevicePress = (deviceId: string) => {
    // If this is the currently connected device, navigate to device info
    if (pairedDevice && pairedDevice.id === deviceId) {
      router.push('/device-info');
    } else {
      // In the future, this would attempt to reconnect to the saved device
      // For now, just navigate to the bluetooth screen
      router.push('/bluetooth');
    }
  };

  const handleAddDevice = () => {
    router.push('/bluetooth');
  };

  return (
    <SafeAreaView style={themedStyles.container}>
      <Stack.Screen
        options={{
          headerBackTitle: "Home",
          title: "",
          headerStyle: {
            backgroundColor: useThemeColor({}, "background"),
          },
          headerShadowVisible: false,
        }}
      />
      <View style={themedStyles.contentContainer}>
        <View style={themedStyles.headerContainer}>
          <ScreenHeader
            title="My Devices"
            subtitle="Manage your paired devices"
          />
        </View>
        
        <ScrollView 
          contentContainerStyle={themedStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Saved Devices Section */}
          {savedDevices.length > 0 ? (
            <View style={themedStyles.section}>
              {savedDevices.map((device) => {
                const isConnected = pairedDevice?.id === device.id;
                
                // Create a mock device object compatible with DeviceItem component
                // Using type assertion with unknown to bypass TypeScript's type checking
                // In a real implementation, we would fetch the actual Device object from BLE
                const mockDevice = {
                  id: device.id,
                  name: device.name,
                  isConnected: () => isConnected,
                  localName: device.name,
                  serviceUUIDs: [],
                  rssi: 0,
                  txPowerLevel: 0,
                  manufacturerData: null,
                  serviceData: {},
                  mtu: 20,
                  solicitedServiceUUIDs: [],
                  overflowServiceUUIDs: [],
                  isConnectable: true
                } as unknown as Device;
                
                return (
                  <DeviceItem
                    key={device.id}
                    device={mockDevice}
                    onPress={() => handleDevicePress(device.id)}
                    isConnecting={false}
                    isDisabled={false}
                    isPaired={isConnected}
                  />
                );
              })}
            </View>
          ) : (
            <EmptyState 
              isScanning={false}
              message="No devices paired yet"
              subMessage="Add a device to get started"
            />
          )}
        </ScrollView>
        
        {/* Add Device Button */}
        <View style={themedStyles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              themedStyles.addButton,
              {
                backgroundColor: buttonColor,
                opacity: pressed ? 0.9 : 1,
              }
            ]}
            onPress={handleAddDevice}
          >
            <ThemedText 
              style={themedStyles.addButtonText}
              lightColor={buttonTextColor} 
              darkColor={buttonTextColor}
            >
              Add Device
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// A function that creates styles with theme-aware colors
export const createThemedStyles = () => {
  const backgroundColor = useThemeColor({}, "background");
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const shadowColor = useThemeColor({ light: "#000000", dark: "#000000" }, "text");

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor,
      paddingTop: 8,
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
      paddingBottom: 100, // Extra padding for button at bottom
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
    buttonContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: backgroundColor,
    },
    addButton: {
      borderRadius: 10,
      paddingVertical: 16,
      alignItems: 'center',
    },
    addButtonText: {
      fontSize: 17,
      fontWeight: '600',
    },
  });
};
