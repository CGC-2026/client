import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ErrorMessageProps {
  message: string | undefined;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  const errorColor = useThemeColor({}, "error");

  if (!message) return null;

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
