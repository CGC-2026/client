import { ControlledInput } from "@/components/ui/ControlledInput";
import CustomKeyboardAvoidingView from "@/components/ui/CustomKeyboardAvoidingView";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { InfoMessage } from "@/components/ui/InfoMessage";
import createAuthThemedStyles from "@/styles/auth.styles";
import { signUpSchema } from "@/types/authSchemas";
import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PasswordResetNewScreenProps {
  email: string;
  next: () => void;
}

export default function PasswordResetNewScreen({
  email,
  next,
}: PasswordResetNewScreenProps) {
  const styles = createAuthThemedStyles();
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isLoading },
    setError,
  } = useForm<{ password: string }>({
    resolver: zodResolver(signUpSchema.pick({ password: true })),
    defaultValues: {
      password: "",
    },
  });
  const onPasswordSubmit = async (data: { password: string }) => {
    if (!isLoaded || !signIn) return;
    try {
      const res = await signIn.resetPassword({ password: data.password });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        next();
      } else {
        setError("password", {
          message: "Failed to reset password. Please try again.",
        });
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(
        "password",
        err.errors?.[0]?.message || {
          message: "Failed to reset password. Please try again.",
        },
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomKeyboardAvoidingView>
        <ScrollView>
          <View style={styles.content}>
            <Text style={styles.title}>Reset Your Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below. Make sure it's at least 8
              characters long and includes uppercase, lowercase, and numbers.
            </Text>
            <ErrorMessage message={passwordErrors.password?.message} />
            <InfoMessage>
              Resetting password for:{" "}
              <Text style={styles.emailText}>{email}</Text>
            </InfoMessage>
            <View style={styles.form}>
              <ControlledInput
                control={passwordControl}
                name="password"
                label="New Password"
                placeholder="Enter your new password"
                secureTextEntry
                autoComplete="password-new"
                editable={!isLoading}
                error={passwordErrors.password?.message}
              />
              <Pressable
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handlePasswordSubmit(onPasswordSubmit)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
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
