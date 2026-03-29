import { env } from "@/constants/env";
import { logger } from "@/lib/logger";
import axios, { AxiosInstance } from "axios";

const TAG = "AuthClient";

/**
 * Extracts a human-readable message and structured context from an Axios error
 * so Sentry captures the actual backend response rather than the generic axios message.
 */
export function extractAxiosErrorContext(error: unknown): {
  message: string;
  context: Record<string, unknown>;
} {
  if (!axios.isAxiosError(error)) {
    return { message: String(error), context: {} };
  }

  const status = error.response?.status;
  const method = error.config?.method?.toUpperCase() ?? "?";
  const url = error.config?.url ?? "?";
  const data = error.response?.data;

  const backendMessage: string =
    (typeof data === "object" && data !== null
      ? ((data as Record<string, unknown>).message ??
        (data as Record<string, unknown>).error ??
        (data as Record<string, unknown>).detail)
      : undefined) as string | undefined ?? error.message;

  return {
    message: `HTTP ${status ?? "?"} ${method} ${url} — ${backendMessage}`,
    context: {
      status,
      method,
      url,
      responseBody: data,
    },
  };
}

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

  // Log all non-2xx responses centrally so every service gets full context.
  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response) {
        const { message, context } = extractAxiosErrorContext(error);
        const status = error.response.status;
        if (status >= 500) {
          logger.error(TAG, message, error, context);
        } else {
          logger.warn(TAG, message, context);
        }
      }
      return Promise.reject(error);
    },
  );

  return instance;
}
