import { createAuthApiClient } from "@/lib/authClient";
import { AxiosInstance } from "axios";
import React, {
  createContext,
  useContext,
  useMemo
} from "react";
import { useAuth } from "./Auth.Provider";

const AuthApiContext = createContext<AxiosInstance | null | undefined>(undefined);

export const AuthApiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getToken } = useAuth();

  const authClient = useMemo(() => {
    if (!getToken) return null;
    // Force skipCache: true to ensure we always get a fresh token from Clerk.
    // This helps mitigate clock skew issues where a cached token might be 
    // considered valid by the client but expired by the server.
    const wrappedGetToken = () => getToken({ skipCache: true });
    return createAuthApiClient(wrappedGetToken);
  }, [getToken]);

  return (
    <AuthApiContext.Provider value={authClient}>
      {children}
    </AuthApiContext.Provider>
  );
};

export function useAuthApiClient(): AxiosInstance | null {
  const context = useContext(AuthApiContext);
  if (context === undefined) {
    throw new Error(
      "[AuthApiProvider] useAuthApiClient must be used within an <AuthApiProvider>."
    );
  }
  return context;
}
