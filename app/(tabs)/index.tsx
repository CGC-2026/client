import { IconSymbol } from "@/components/ui/IconSymbol";
import { useBLE } from "@/contexts/BLE.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { pairedDevice } = useBLE();
  const router = useRouter();
  const textColor = useThemeColor({}, "text");

  const handleDevicePress = () => {
    if (pairedDevice) {
      // If device is already connected, go directly to device info
      router.push('/device-info');
    } else {
      // If no device connected, go to bluetooth screen to connect
      router.push('/bluetooth');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNavBar}>
        <View style={styles.navContent}>
          <View style={styles.navLeft}>
            <Text style={[styles.navTitle, { color: textColor }]}>
              Knee Sleeve
            </Text>
          </View>
          <View style={styles.navRight}>
            <Pressable
              style={({ pressed }) => [
                styles.navButton,
                { opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={handleDevicePress}
            >
              <IconSymbol
                name={pairedDevice ? "checkmark.circle.fill" : "circle"}
                size={24}
                color={pairedDevice ? "#4CAF50" : "#ccc"}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.welcomeText, { color: textColor }]}>
          Welcome to Knee Sleeve
        </Text>
        <Text style={[styles.subtitle, { color: textColor, opacity: 0.7 }]}>
          {pairedDevice ? 'Device connected' : 'Tap the icon to connect your device'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNavBar: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  navContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLeft: {
    flex: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});


