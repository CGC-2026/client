import {
  signUpSchema,
  verificationCodeSchema,
  type SignUpFormData,
  type VerificationCodeFormData,
} from "@/app/types/authSchemas";
import OAuthProviderButtons from "@/components/auth/OAuthProviderButtons";
import { ControlledInput } from "@/components/ui/ControlledInput";
import CustomKeyboardAvoidingView from "@/components/ui/CustomKeyboardAvoidingView";
import Divider from "@/components/ui/Divider";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useSignUp, useSSO } from "@clerk/clerk-expo";
import type { OAuthStrategy } from "@clerk/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const [pendingVerification, setPendingVerification] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const styles = createThemedStyles();

  const {
    control: signUpControl,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      emailAddress: "",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    control: verificationControl,
    handleSubmit: handleVerificationSubmit,
    formState: { errors: verificationErrors },
  } = useForm<VerificationCodeFormData>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSSOPress = async (strategy: OAuthStrategy, provider: string) => {
    try {
      setIsLoading(true);
      setError("");

      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy,
      });

      if (createdSessionId) {
        await ssoSetActive!({ session: createdSessionId });
        router.replace("/onboarding");
      }
    } catch (err: any) {
      console.error(`${provider} SSO error:`, err);
      setError(
        err.errors?.[0]?.message || `Failed to sign up with ${provider}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSignUpPress = async (data: SignUpFormData) => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      await signUp.create({
        firstName: data.firstName,
        lastName: data.lastName,
        emailAddress: data.emailAddress,
        password: data.password,
      });

      // Send the email verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Store email for display in verification screen
      setEmailAddress(data.emailAddress);

      // Change the UI to show the verification form
      setPendingVerification(true);
    } catch (err: any) {
      console.error("Sign up error:", JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const onPressVerify = async (data: VerificationCodeFormData) => {
    if (!isLoaded) return;
    setIsLoading(true);
    setError("");

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: data.code.trim(),
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace("/onboarding");
      } else {
        console.error(
          "Sign up incomplete:",
          JSON.stringify(completeSignUp, null, 2),
        );
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      console.error("Verification error:", JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const [resendingEmail, setResendingEmail] = useState(false);

  const onResendEmail = async () => {
    if (!isLoaded) return;
    setResendingEmail(true);
    setError("");

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      // Show success message or toast here if desired
    } catch (err: any) {
      console.error("Email resend error:", JSON.stringify(err, null, 2));
      setError(
        err.errors?.[0]?.message || "Failed to resend verification email",
      );
    } finally {
      setResendingEmail(false);
    }
  };

  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomKeyboardAvoidingView>
          <ScrollView contentContainerStyle={styles.scrollView}>
            <View style={styles.content}>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a verification code to {emailAddress}
              </Text>

              <ErrorMessage message={error} />

              <View style={styles.form}>
                <ControlledInput
                  control={verificationControl}
                  name="code"
                  label="Verification Code"
                  placeholder="Enter verification code"
                  keyboardType="number-pad"
                  editable={!isLoading}
                  error={verificationErrors.code?.message}
                />

                <Pressable
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleVerificationSubmit(onPressVerify)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Email</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={onResendEmail}
                  disabled={resendingEmail || isLoading}
                >
                  {resendingEmail ? (
                    <ActivityIndicator
                      color={styles.secondaryButtonText.color}
                      size="small"
                    />
                  ) : (
                    <Text style={styles.secondaryButtonText}>
                      Resend verification email
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </CustomKeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomKeyboardAvoidingView>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>

            <ErrorMessage message={error} />

            <OAuthProviderButtons
              isLoading={isLoading}
              onSSOPress={onSSOPress}
            />
            <Divider />

            <View style={styles.form}>
              <ControlledInput
                control={signUpControl}
                name="firstName"
                label="First Name"
                placeholder="Enter your first name"
                autoComplete="given-name"
                editable={!isLoading}
                error={signUpErrors.firstName?.message}
              />

              <ControlledInput
                control={signUpControl}
                name="lastName"
                label="Last Name"
                placeholder="Enter your last name"
                autoComplete="family-name"
                editable={!isLoading}
                error={signUpErrors.lastName?.message}
              />

              <ControlledInput
                control={signUpControl}
                name="emailAddress"
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
                error={signUpErrors.emailAddress?.message}
              />

              <ControlledInput
                control={signUpControl}
                name="password"
                label="Password"
                placeholder="Create a password"
                secureTextEntry
                autoComplete="password-new"
                editable={!isLoading}
                error={signUpErrors.password?.message}
              />

              <ControlledInput
                control={signUpControl}
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Confirm your password"
                secureTextEntry
                autoComplete="password-new"
                editable={!isLoading}
                error={signUpErrors.confirmPassword?.message}
              />

              <Pressable
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSignUpSubmit(onSignUpPress)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </Pressable>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Link href="/sign-in" asChild>
                  <Pressable disabled={isLoading}>
                    <Text style={styles.link}>Sign In</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </CustomKeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createThemedStyles = () => {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const errorColor = useThemeColor({}, "error");
  const buttonTextColor = useThemeColor({}, "buttonText");
  const buttonColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor,
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 40,
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
    },
    errorContainer: {
      backgroundColor: errorColor,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: errorColor,
    },
    errorText: {
      color: errorColor,
      fontSize: 14,
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
    secondaryButton: {
      backgroundColor: buttonColor,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
    },
    secondaryButtonText: {
      color: buttonTextColor,
      fontSize: 16,
      fontWeight: "600",
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
    oauthContainer: {
      gap: 12,
      marginBottom: 24,
    },

    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: borderColor,
    },
    dividerText: {
      marginHorizontal: 16,
      fontSize: 14,
      color: textSecondaryColor,
    },
  });
};
