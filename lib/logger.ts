import { env } from "@/constants/env";
import * as Sentry from "@sentry/react-native";

/**
 * Centralized logger that routes to Sentry and mirrors to the console in dev.
 *
 * Usage guidelines:
 *   logger.error  — caught exceptions and unexpected failures (sends to Sentry)
 *   logger.warn   — expected-but-notable conditions (breadcrumb only)
 *   logger.info   — key lifecycle events for observability (breadcrumb only)
 *
 * Do NOT call for high-frequency events (e.g. per-packet sensor data).
 */

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === "string" ? value : JSON.stringify(value));
}

export const logger = {
  /**
   * Captures an exception in Sentry and logs to console in dev.
   * Use for unexpected failures that need investigation.
   */
  error(
    tag: string,
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ): void {
    if (env.ENV === "development") {
      console.error(`[${tag}] ${message}`, error ?? "", context ?? "");
    }

    if (error !== undefined) {
      Sentry.captureException(toError(error), {
        extra: { tag, message, ...context },
      });
    } else {
      Sentry.captureMessage(`[${tag}] ${message}`, {
        level: "error",
        extra: context,
      });
    }
  },

  /**
   * Adds a warning breadcrumb. Use for expected-but-notable conditions
   * (e.g. 401 responses, invalid BLE packets).
   */
  warn(
    tag: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (env.ENV === "development") {
      console.warn(`[${tag}] ${message}`, context ?? "");
    }

    Sentry.addBreadcrumb({
      category: tag,
      message,
      data: context,
      level: "warning",
    });
  },

  /**
   * Adds an info breadcrumb. Use for key lifecycle events
   * (BLE connect/disconnect, session start/end, set start/end).
   */
  info(
    tag: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (env.ENV === "development") {
      console.log(`[${tag}] ${message}`, context ?? "");
    }

    Sentry.addBreadcrumb({
      category: tag,
      message,
      data: context,
      level: "info",
    });
  },
};
