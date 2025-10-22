import React, { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

interface InfoMessageProps {
  children: ReactNode;
}

export const InfoMessage: React.FC<InfoMessageProps> = ({ children }) => {
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return (
    <View
      style={[
        styles.infoContainer,
        { backgroundColor: cardColor, borderColor },
      ]}
    >
      <Text style={[styles.infoText, { color: textSecondaryColor }]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  infoContainer: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
