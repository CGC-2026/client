import { ble } from "@/constants/BLE";
import AuthProvider from "@/contexts/Auth.Provider";
import { AuthApiProvider } from "@/contexts/AuthApi.Provider";
import { BatteryProvider } from "@/contexts/Battery.Provider";
import BLEProvider from "@/contexts/BLE.Provider";
import { CalibrationProvider } from "@/contexts/Calibration.Provider";
import CSVExportProvider from "@/contexts/CSVExport.Provider";
import { KneeDeviceProvider } from "@/contexts/KneeDevice.Provider";
import MenuProvider from "@/contexts/Menu.Provider";
import QueryProvider from "@/contexts/QueryClient.Provider";
import { StorageProvider } from "@/contexts/Storage.Provider";
import { WorkoutProvider } from "@/contexts/Workout.Provider";
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
        <StorageProvider>
          <AuthProvider>
            <AuthApiProvider>
              <CSVExportProvider>
                <BLEProvider reconnectUUIDs={[ble.smartKneeServiceUUID]}>
                  <KneeDeviceProvider>
                    <CalibrationProvider>
                      <BatteryProvider>
                        <WorkoutProvider>
                          <MenuProvider>
                            <Stack>
                              <Stack.Screen
                                name="(tabs)"
                                options={{ headerShown: false }}
                              />
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
                              <Stack.Screen
                                name="onboarding"
                                options={{
                                  headerShown: false,
                                  gestureEnabled: false,
                                }}
                              />
                              <Stack.Screen
                                name="calibration"
                                options={{
                                  title: "Calibrate Sleeve",
                                  presentation: "modal",
                                  headerShown: false,
                                }}
                              />
                              <Stack.Screen name="+not-found" />
                            </Stack>
                            <StatusBar style="auto" />
                          </MenuProvider>
                        </WorkoutProvider>
                      </BatteryProvider>
                    </CalibrationProvider>
                  </KneeDeviceProvider>
                </BLEProvider>
              </CSVExportProvider>
            </AuthApiProvider>
          </AuthProvider>
        </StorageProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
