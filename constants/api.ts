export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (() => {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not set");
  })();
