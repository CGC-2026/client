import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet } from "react-native";

export default function createAuthThemedStyles() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const errorColor = useThemeColor({}, "error");
  const buttonTextColor = useThemeColor({}, "buttonText");
  const buttonColor = useThemeColor({}, "tint");

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor,
    },
    keyboardView: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: "center",
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      marginBottom: 8,
      color: textColor,
    },
    subtitle: {
      fontSize: 16,
      color: textSecondaryColor,
      marginBottom: 32,
      lineHeight: 24,
    },
    emailText: {
      color: buttonColor,
      fontWeight: "600",
    },
    errorContainer: {
      backgroundColor: "#fee",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#fcc",
    },
    errorText: {
      color: errorColor,
      fontSize: 14,
    },
    infoContainer: {
      backgroundColor: useThemeColor({}, "card"),
      borderRadius: 8,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: useThemeColor({}, "border"),
    },
    infoText: {
      color: textSecondaryColor,
      fontSize: 14,
      lineHeight: 20,
    },
    form: {
      gap: 16,
    },
    button: {
      backgroundColor: buttonColor,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: buttonTextColor,
      fontSize: 16,
      fontWeight: "600",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 16,
      alignItems: "center",
    },
    footerText: {
      fontSize: 14,
      color: textSecondaryColor,
    },
    link: {
      fontSize: 14,
      color: buttonColor,
      fontWeight: "600",
    },
    secondaryButton: {
      backgroundColor: "transparent",
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
      borderWidth: 1,
      borderColor: buttonColor,
    },
    secondaryButtonText: {
      color: buttonColor,
      fontSize: 16,
      fontWeight: "600",
    },
    successContainer: {
      backgroundColor: "#e8f5e8",
      borderRadius: 8,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: "#4CAF50",
    },
    successText: {
      color: "#2E7D32",
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
  });
}
