import OAuthProviderButtons from "@/components/auth/OAuthProviderButtons";
import { ControlledInput } from "@/components/ui/ControlledInput";
import CustomKeyboardAvoidingView from "@/components/ui/CustomKeyboardAvoidingView";
import Divider from "@/components/ui/Divider";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import createAuthThemedStyles from "@/styles/auth.styles";
import { signInSchema, type SignInFormData } from "@/types/authSchemas";
import { useSignIn, useSSO } from "@clerk/clerk-expo";
import type { OAuthStrategy } from "@clerk/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const styles = createAuthThemedStyles();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      emailAddress: "",
      password: "",
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
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.error(`${provider} SSO error:`, err);
      setError(
        err.errors?.[0]?.message || `Failed to sign in with ${provider}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSignInPress = async (data: SignInFormData) => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const signInAttempt = await signIn.create({
        identifier: data.emailAddress,
        password: data.password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(tabs)");
      } else {
        console.error(
          "Sign in incomplete:",
          JSON.stringify(signInAttempt, null, 2),
        );
        setError("Sign in incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomKeyboardAvoidingView>
        <ScrollView>
          <View style={styles.content}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
            <ErrorMessage message={error} />
            <OAuthProviderButtons
              isLoading={isLoading}
              onSSOPress={onSSOPress}
            />
            <Divider />
            <View style={styles.form}>
              <ControlledInput
                control={control}
                name="emailAddress"
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
                error={errors.emailAddress?.message}
              />
              <ControlledInput
                control={control}
                name="password"
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
                editable={!isLoading}
                error={errors.password?.message}
              />
              <Pressable
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit(onSignInPress)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </Pressable>
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Link href="/sign-up" asChild>
                  <Pressable disabled={isLoading}>
                    <Text style={styles.link}>Sign Up</Text>
                  </Pressable>
                </Link>
              </View>
              <View style={{ alignItems: "center", marginTop: 8 }}>
                <Pressable onPress={() => router.push("/forgot-password")}>
                  <Text style={styles.link}>Forgot password?</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </CustomKeyboardAvoidingView>
    </SafeAreaView>
  );
}
