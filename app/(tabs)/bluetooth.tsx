import DeviceItem from "@/components/bluetooth/DeviceItem";
import EmptyState from "@/components/bluetooth/EmptyState";
import ScanButton from "@/components/bluetooth/ScanButton";
import ScreenHeader from "@/components/bluetooth/ScreenHeader";
import SectionHeader from "@/components/bluetooth/SectionHeader";
import { useIOSBle } from "@/contexts/iOSBLE.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { styles } from "@/styles/bluetooth";
import { Alert, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    connectingDeviceId
  } = useIOSBle();
  
  const backgroundColor = useThemeColor({}, "background");

  const handleDevicePress = (device: any) => {
    // If this is the paired device, show disconnect confirmation
    if (pairedDevice && pairedDevice.id === device.id) {
      Alert.alert(
        "Disconnect Device",
        `Do you want to disconnect from "${device.name || 'Unnamed Device'}"?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          { 
            text: "Disconnect", 
            style: "destructive",
            onPress: () => disconnectDevice()
          }
        ]
      );
    } else {
      // Otherwise try to pair
      pairDevice(device);
    }
  };
    
  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor }]}
      edges={['top']}
    >
      <View style={styles.contentContainer}>
        <ScreenHeader 
          title="Devices" 
          subtitle="Connect to your device" 
        />
        <ScanButton 
          isScanning={isScanning} 
          onPress={isScanning ? stopScan : findDevices} 
          disabled={isConnecting} 
        />
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Connected Devices Section */}
          {pairedDevice && (
            <View style={styles.section}>
              <SectionHeader title="Connected" />
              <DeviceItem
                device={pairedDevice}
                onPress={handleDevicePress}
                isConnecting={false}
                isDisabled={false}
                isPaired={true}
              />
            </View>
          )}
          
          {/* Available Devices Section */}
          {devices.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Available" />
              {devices.map((device) => (
                // Skip if this is the paired device
                pairedDevice?.id === device.id ? null : (
                  <DeviceItem
                    key={device.id}
                    device={device}
                    onPress={handleDevicePress}
                    isConnecting={connectingDeviceId === device.id && isConnecting}
                    isDisabled={isScanning || isConnecting}
                  />
                )
              ))}
            </View>
          )}
          
          {/* Empty State */}
          {devices.length === 0 && !pairedDevice && (
            <EmptyState isScanning={isScanning} />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}