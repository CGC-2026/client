import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type BLEGateBannerProps = {
  onConnectPress: () => void;
};

export default function BLEGateBanner({ onConnectPress }: BLEGateBannerProps) {
  const themedStyles = createThemedStyles();

  return (
    <View style={themedStyles.container}>
      <Ionicons
        name="bluetooth"
        size={18}
        color={themedStyles.iconColor}
        style={styles.icon}
      />
      <Text style={themedStyles.message}>
        Connect your knee device to start a workout
      </Text>
      <Pressable
        onPress={onConnectPress}
        style={({ pressed }) => [
          themedStyles.button,
          pressed ? themedStyles.buttonPressed : {},
        ]}
      >
        <Text style={themedStyles.buttonText}>Connect</Text>
      </Pressable>
    </View>
  );
}

const createThemedStyles = () => {
  const infoColor = useThemeColor({}, "info");
  const backgroundColor = useThemeColor(
    { light: "#EBF4FB", dark: "#1A2A35" },
    "background",
  );
  const buttonBackground = useThemeColor(
    { light: "#D0E8F5", dark: "#1F3A4A" },
    "background",
  );
  const buttonPressedBackground = useThemeColor(
    { light: "#B8D8EE", dark: "#2A4A5A" },
    "background",
  );

  return {
    container: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor,
      borderRadius: 10,
      marginHorizontal: 16,
      marginBottom: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 8,
    },
    iconColor: infoColor,
    message: {
      flex: 1,
      fontSize: 13,
      color: infoColor,
      lineHeight: 18,
    },
    button: {
      backgroundColor: buttonBackground,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    buttonPressed: {
      backgroundColor: buttonPressedBackground,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: infoColor,
    },
  };
};

const styles = StyleSheet.create({
  icon: {
    flexShrink: 0,
  },
});
