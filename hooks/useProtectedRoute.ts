import { useStorage } from "@/contexts/Storage.Provider";
import { isReplayOnboarding } from "@/helpers/onboardingReplay";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

/**
 * Custom hook to protect routes and redirect users based on authentication state
 * and onboarding completion status
 */
export function useProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const [onboardingComplete, , isStorageLoading] = useStorage(
    "ble.onboardingComplete",
  );
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for both auth and storage to load
    if (!isLoaded || isStorageLoading) return;

    const onAuthScreens =
      segments[0] === "sign-in" || segments[0] === "sign-up";
    const onOnboardingScreen = segments[0] === "onboarding";

    if (!isSignedIn && !onAuthScreens) {
      // Redirect to sign-in if user is not signed in and trying to access protected routes
      router.replace("/sign-in");
    } else if (isSignedIn && onAuthScreens) {
      // Redirect to onboarding or app based on onboarding status
      if (onboardingComplete) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    } else if (
      isSignedIn &&
      !onboardingComplete &&
      !onOnboardingScreen &&
      !onAuthScreens
    ) {
      // User is signed in but hasn't completed onboarding - redirect to onboarding
      router.replace("/onboarding");
    } else if (isSignedIn && onboardingComplete && onOnboardingScreen) {
      // User has completed onboarding but is on onboarding screen - redirect to app
      // unless they intentionally replayed onboarding via the ? button
      if (!isReplayOnboarding()) {
        router.replace("/(tabs)");
      }
    }
  }, [isLoaded, isSignedIn, onboardingComplete, isStorageLoading, segments]);
}
