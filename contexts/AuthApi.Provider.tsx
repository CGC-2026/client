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
    return createAuthApiClient(getToken);
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
