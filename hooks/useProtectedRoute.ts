import { useAuth } from "@clerk/clerk-expo";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

/**
 * Custom hook to protect routes and redirect users based on authentication state
 */
export function useProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const onAuthScreens = segments[0] == "sign-in" || segments[0] == "sign-up";

    if (!isSignedIn && !onAuthScreens) {
      // Redirect to sign-in if user is not signed in and trying to access protected routes
      router.replace("/sign-in");
    } else if (isSignedIn && onAuthScreens) {
      // Redirect to app if user is signed in and on auth screens
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn, segments]);
}
