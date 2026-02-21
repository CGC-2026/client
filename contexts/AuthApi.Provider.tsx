import { createAuthApiClient } from "@/lib/authClient";
import { AxiosInstance } from "axios";
import React, {
  createContext,
  useContext,
  useMemo
} from "react";
import { useAuth } from "./Auth.Provider";

const AuthApiContext = createContext<AxiosInstance | null>(null);

export const AuthApiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getToken } = useAuth();

  const authClient = useMemo(() => {
    if (!getToken) return null;
    return createAuthApiClient(getToken as () => Promise<string | null>);
  }, [getToken]);

  const value = authClient;

  return (
    <AuthApiContext.Provider value={value}>
      {children}
    </AuthApiContext.Provider>
  );
};

export function useAuthApiClient(): AxiosInstance {
  const context = useContext(AuthApiContext);
  if (!context) {
    throw new Error(
      "[AuthApiProvider] useAuthApiClient must be used within an <AuthApiProvider>."
    );
  }
  return context;
}
