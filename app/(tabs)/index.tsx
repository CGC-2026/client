import { IconSymbol } from "@/components/ui/IconSymbol";
import { useBLE } from "@/contexts/BLE.Provider";
import { useMenu } from "@/contexts/Menu.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const menuActions = [
  { id: 'profile', title: 'Profile', image: 'person.fill' },
  { id: 'settings', title: 'Settings', image: 'gear' }
];

export default function HomeScreen() {
  const { pairedDevice } = useBLE();
  const router = useRouter();
  const navigation = useNavigation();
  const textColor = useThemeColor({}, "text");
  const { createContextMenu } = useMenu();
  
  const handleMenuAction = (id: string) => {
    if (id === 'profile') {
    } else if (id === 'settings') {
    }
  };
  
  const handleDevicePress = () => {
    if (pairedDevice) {
      // If device is already connected, go directly to device info
      router.push('/device-info');
    } else {
      // If no device connected, go to bluetooth screen to connect
      router.push('/bluetooth');
    }
  };
  
  // Configure the navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => {
        
        return createContextMenu({
          actions: menuActions,
          onPressAction: handleMenuAction,
          children: (
            <View style={styles.headerButton}>
              <IconSymbol
                name="person.circle.fill"
                color={textColor}
                size={24}
              />
            </View>
          )
        });
      },
      headerRight: () => (
        <Pressable 
          style={styles.headerButton}
          onPress={handleDevicePress}
        >
          <IconSymbol
            name={pairedDevice ? "checkmark.circle.fill" : "circle"}
            size={24}
            color={pairedDevice ? "#4CAF50" : "#ccc"}
          />
        </Pressable>
      ),
    });
  }, [navigation, pairedDevice, textColor]);

  return (
    <SafeAreaView style={styles.container}>
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
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
  },
});


