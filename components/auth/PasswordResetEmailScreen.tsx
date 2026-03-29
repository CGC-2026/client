import createAuthThemedStyles from "@/styles/auth.styles";
import {
  ForgotPasswordFormData,
  forgotPasswordSchema,
} from "@/types/authSchemas";
import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ControlledInput } from "../ui/ControlledInput";
import CustomKeyboardAvoidingView from "../ui/CustomKeyboardAvoidingView";
import { ErrorMessage } from "../ui/ErrorMessage";

interface PasswordResetEmailScreenProps {
  setEmail: (email: string) => void;
  next: () => void;
}

export default function PasswordResetEmailScreen({
  setEmail,
  next,
}: PasswordResetEmailScreenProps) {
  const styles = createAuthThemedStyles();
  const { signIn, isLoaded } = useSignIn();
  const {
    control: emailControl,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors, isLoading },
    setError,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      emailAddress: "",
    },
  });

  const onEmailSubmit = async (data: ForgotPasswordFormData) => {
    if (!isLoaded || !signIn) return;
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: data.emailAddress,
      });
      setEmail(data.emailAddress);
      next();
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(
        "emailAddress",
        err.errors?.[0]?.message ||
          "Failed to send reset email. Please try again.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomKeyboardAvoidingView>
        <ScrollView>
          <View style={styles.content}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a verification code to
              reset your password.
            </Text>
            <ErrorMessage message={emailErrors.emailAddress?.message} />
            <View style={styles.form}>
              <ControlledInput
                control={emailControl}
                name="emailAddress"
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
                error={emailErrors.emailAddress?.message}
              />

              <Pressable
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleEmailSubmit(onEmailSubmit)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </Pressable>
              <View style={styles.footer}>
                <Text style={styles.footerText}>Remember your password? </Text>
                <Pressable
                  onPress={() => router.push("/sign-in")}
                  disabled={isLoading}
                >
                  <Text style={styles.link}>Sign In</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </CustomKeyboardAvoidingView>
    </SafeAreaView>
  );
}
