import { env } from "@/constants/env";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { ReactNode } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";

// Secure token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error("Error getting token:", err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("Error saving token:", err);
    }
  },
};

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const publishableKey = env.CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      "Missing Clerk Publishable Key. Please add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env",
    );
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>{children}</ClerkLoaded>
    </ClerkProvider>
  );
}

export function useAuth() {
  const { isLoaded, isSignedIn, signOut } = useClerkAuth();
  const { user } = useUser();

  return {
    isLoaded,
    isSignedIn,
    user,
    signOut,
  };
}
