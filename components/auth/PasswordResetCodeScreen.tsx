import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  View,
  Text,
} from "react-native";
import { ControlledInput } from "../ui/ControlledInput";
import CustomKeyboardAvoidingView from "../ui/CustomKeyboardAvoidingView";
import { ErrorMessage } from "../ui/ErrorMessage";
import { InfoMessage } from "../ui/InfoMessage";
import createAuthThemedStyles from "@/styles/auth.styles";
import {
  VerificationCodeFormData,
  verificationCodeSchema,
} from "@/app/types/authSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSignIn } from "@clerk/clerk-expo";
import { FlowState } from "@/app/forgot-password";

interface PasswordResetCodeScreenProps {
  email: string;
  next: (overrideFlowState?: FlowState) => void;
}

export default function PasswordResetCodeScreen({
  email,
  next,
}: PasswordResetCodeScreenProps) {
  const styles = createAuthThemedStyles();
  const { signIn, isLoaded, setActive } = useSignIn();
  const {
    control: codeControl,
    handleSubmit: handleCodeSubmit,
    formState: { errors: codeErrors, isLoading },
    setError,
  } = useForm<VerificationCodeFormData>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const onResendEmail = async () => {
    if (!email || !isLoaded || !signIn) {
      setError("code", { message: "Please enter your email address first" });
      return;
    }
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
    } catch (err: any) {
      console.error("Password reset resend error:", err);
      setError("code", {
        message:
          err.errors?.[0]?.message ||
          "Failed to resend reset email. Please try again.",
      });
    }
  };

  const onCodeSubmit = async (data: VerificationCodeFormData) => {
    if (!isLoaded || !signIn) return;
    try {
      const res = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: data.code.trim(),
      });

      if (res.status === "needs_new_password") {
        next();
      } else if (res.status === "complete") {
        // Rare, but handle just in case
        await setActive({ session: res.createdSessionId });
        next("password");
      } else {
        // Any other status means the code isn’t accepted yet
        setError("code", {
          message: "Invalid or expired code. Try again or resend.",
        });
      }
    } catch (err: any) {
      console.error("Code verification error:", err);
      setError("code", {
        message:
          err.errors?.[0]?.message ||
          "Invalid verification code. Please try again.",
      });
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <CustomKeyboardAvoidingView>
        <ScrollView>
          <View style={styles.content}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to{" "}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
            <InfoMessage>
              Enter the 6-digit code you received in your email to continue with
              password reset.
            </InfoMessage>
            <ErrorMessage message={codeErrors.code?.message} />
            <View style={styles.form}>
              <ControlledInput
                control={codeControl}
                name="code"
                label="Verification Code"
                placeholder="Enter 6-digit code"
                keyboardType="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                editable={!isLoading}
                error={codeErrors.code?.message}
              />
              <Pressable
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleCodeSubmit(onCodeSubmit)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryButton,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={onResendEmail}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>Resend Code</Text>
              </Pressable>
            </View>
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
        </ScrollView>
      </CustomKeyboardAvoidingView>
    </SafeAreaView>
  );
}
