import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

interface ErrorMessageProps {
  message: string | undefined;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  const errorColor = useThemeColor({}, "error");

  return (
    <View style={styles.errorContainer}>
      <Text style={[styles.errorText, { color: errorColor }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: "#fee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fcc",
  },
  errorText: {
    fontSize: 14,
  },
});
