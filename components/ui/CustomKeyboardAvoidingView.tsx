import {
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
  StyleSheet,
} from "react-native";

interface CustomKeyboardAvoidingViewProps extends KeyboardAvoidingViewProps {
  children: React.ReactNode;
}

export default function CustomKeyboardAvoidingView({
  children,
  ...props
}: CustomKeyboardAvoidingViewProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardView}
      {...props}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
});
