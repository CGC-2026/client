import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  Path,
  PathValue,
} from "react-hook-form";
import { useThemeColor } from "@/hooks/useThemeColor";

interface ControlledInputProps<T extends FieldValues> extends TextInputProps {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  error?: string;
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  label,
  error,
  ...textInputProps
}: ControlledInputProps<T>) {
  const styles = createThemedStyles();

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <TextInput
            ref={ref}
            style={[styles.input, error && styles.inputError]}
            onBlur={onBlur}
            {...textInputProps}
            onChangeText={onChange}
            value={value}
            placeholderTextColor={styles.placeholderText.color}
          />
        )}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const createThemedStyles = () => {
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const errorColor = useThemeColor({}, "error");
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return StyleSheet.create({
    inputContainer: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: textColor,
    },
    input: {
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: cardColor,
      color: textColor,
    },
    inputError: {
      borderColor: errorColor,
    },
    errorText: {
      color: errorColor,
      fontSize: 12,
      marginTop: -4,
    },
    placeholderText: {
      color: textSecondaryColor,
    },
  });
};
