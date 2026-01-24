import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
// import { useWorkout } from "@/contexts/Workout.Provider";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // const workout = useWorkout();
  useProtectedRoute();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: true,
        headerTitleAlign: "center",
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: "Activities",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet" color={color} />
          ),
          // tabBarBadge: workout.isSessionActive ? "" : undefined,
          tabBarBadgeStyle: {
            minWidth: 8,
            maxWidth: 8,
            minHeight: 8,
            maxHeight: 8,
          },
        }}
      />
      <Tabs.Screen
        name="dev"
        options={{
          title: "Dev",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="wrench.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
