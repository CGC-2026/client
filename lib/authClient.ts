import { env } from "@/constants/env";
import axios, { AxiosInstance } from "axios";

/**
 * Creates an axios instance that attaches the Clerk JWT to every request.
 * Use for authenticated API calls; backend derives user from the token.
 *
 * @param getToken - Function that returns the current JWT (e.g. from Clerk useAuth().getToken)
 * @returns Axios instance with baseURL and Bearer token request interceptor
 */
export function createAuthApiClient(
  getToken: () => Promise<string | null>,
): AxiosInstance {
  const instance = axios.create({
    baseURL: env.API_URL,
    timeout: 15_000,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": true,
    },
  });

  instance.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
}
