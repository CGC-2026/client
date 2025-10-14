import AuthProvider from "@/contexts/Auth.Provider";
import BLEProvider from "@/contexts/BLE.Provider";
import MenuProvider from "@/contexts/Menu.Provider";
import QueryProvider from "@/contexts/QueryClient.Provider";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <QueryProvider>
        <AuthProvider>
          <BLEProvider>
            <MenuProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="sign-in"
                  options={{ headerShown: false, title: "Sign In" }}
                />
                <Stack.Screen
                  name="sign-up"
                  options={{ headerShown: false, title: "Sign Up" }}
                />
                <Stack.Screen
                  name="forgot-password"
                  options={{ title: "Forgot Password" }}
                />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </MenuProvider>
          </BLEProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
