const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

const config = getSentryExpoConfig(__dirname);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expo-updates") {
    return {
      type: "empty",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
