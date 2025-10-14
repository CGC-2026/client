import type { OAuthStrategy } from "@clerk/types";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { allowedOAuthProviders } from "@/constants/clerk";
import { AntDesign, FontAwesome } from "@expo/vector-icons";

interface OAuthProviderButtonsProps {
  onSSOPress: (strategy: OAuthStrategy, provider: string) => void;
  isLoading: boolean;
}

export default function OAuthProviderButtons({
  onSSOPress,
  isLoading,
}: OAuthProviderButtonsProps) {
  const styles = createThemedStyles();
  return (
    <View style={styles.oauthContainer}>
      {allowedOAuthProviders.includes("oauth_google") && (
        <Pressable
          style={[styles.oauthButton, styles.googleButton]}
          onPress={() => onSSOPress("oauth_google", "Google")}
          disabled={isLoading}
        >
          <AntDesign name="google" size={20} color="#DB4437" />
          <Text style={styles.oauthButtonText}>Continue with Google</Text>
        </Pressable>
      )}
      {allowedOAuthProviders.includes("oauth_microsoft") && (
        <Pressable
          style={[styles.oauthButton, styles.microsoftButton]}
          onPress={() => onSSOPress("oauth_microsoft", "Microsoft")}
          disabled={isLoading}
        >
          <FontAwesome name="windows" size={20} color="#FFFFFF" />
          <Text style={[styles.oauthButtonText, { color: "#fff" }]}>
            Continue with Microsoft
          </Text>
        </Pressable>
      )}
      {allowedOAuthProviders.includes("oauth_apple") && (
        <Pressable
          style={[styles.oauthButton, styles.appleButton]}
          onPress={() => onSSOPress("oauth_apple", "Apple")}
          disabled={isLoading}
        >
          <AntDesign name="apple1" size={20} color="#FFFFFF" />
          <Text style={[styles.oauthButtonText, { color: "#fff" }]}>
            Continue with Apple
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const createThemedStyles = () => {
  return StyleSheet.create({
    oauthContainer: {
      gap: 12,
      marginBottom: 24,
    },
    oauthButton: {
      flexDirection: "row",
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      borderWidth: 1,
    },
    googleButton: {
      backgroundColor: "#fff",
      borderColor: "#ddd",
    },
    microsoftButton: {
      backgroundColor: "#00A4EF",
      borderColor: "#00A4EF",
    },
    appleButton: {
      backgroundColor: "#000",
      borderColor: "#000",
    },
    oauthButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#000",
    },
  });
};
