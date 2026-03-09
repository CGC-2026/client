import EmptyState from "@/components/bluetooth/EmptyState";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import BLEGateBanner from "@/components/workout/BLEGateBanner";
import WorkoutTypeListItem from "@/components/workout/WorkoutTypeListItem";
import { useAuth } from "@/contexts/Auth.Provider";
import { useBLE } from "@/contexts/BLE.Provider";
import { useMenu } from "@/contexts/Menu.Provider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWorkoutTypes } from "@/hooks/useWorkoutTypes";
import { WorkoutType } from "@/types/workout.types";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

const menuActions = [
  { id: "calibrate", title: "Calibrate Sleeve", image: "scope" },
  { id: "signOut", title: "Sign Out", image: "eject" },
];

export default function HomeScreen() {
  const { pairedDevice } = useBLE();
  const router = useRouter();
  const navigation = useNavigation();
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const { createContextMenu } = useMenu();
  const { signOut } = useAuth();
  const themedStyles = createThemedStyles();

  const { data: workoutTypes, isLoading, isError, refetch, isRefetching } = useWorkoutTypes();

  const handleMenuAction = useCallback(async (id: string) => {
    if (id === "calibrate") {
      router.push("/calibration");
    } else if (id === "signOut") {
      await signOut();
      router.replace("/sign-in");
    }
  }, [router, signOut]);

  const handleDevicePress = useCallback(() => {
    router.push("/my-devices");
  }, [router]);

  // Configure the navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => {
        return createContextMenu({
          actions: menuActions,
          onPressAction: handleMenuAction,
          children: (
            <View style={styles.headerButton}>
              <IconSymbol
                name="person.circle.fill"
                color={textColor}
                size={24}
              />
            </View>
          ),
        });
      },
      headerRight: () => (
        <Pressable style={styles.headerButton} onPress={handleDevicePress}>
          <IconSymbol
            name={pairedDevice ? "checkmark.circle.fill" : "circle"}
            size={24}
            color={pairedDevice ? "#4CAF50" : "#ccc"}
          />
        </Pressable>
      ),
    });
  }, [navigation, pairedDevice, textColor, handleMenuAction, handleDevicePress, createContextMenu]);

  const handleWorkoutTypePress = useCallback((workoutType: WorkoutType) => {
    router.push({ pathname: "/workout/[id]", params: { id: workoutType.id } });
  }, [router]);

  const renderItem = useCallback(({ item }: { item: WorkoutType }) => (
    <WorkoutTypeListItem
      workoutType={item}
      onPress={handleWorkoutTypePress}
      disabled={!pairedDevice}
    />
  ), [pairedDevice, handleWorkoutTypePress]);

  const ListHeaderComponent = !pairedDevice ? (
    <BLEGateBanner onConnectPress={handleDevicePress} />
  ) : null;

  return (
    <ThemedView style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <EmptyState
            isScanning={false}
            message="Couldn't load workouts"
            subMessage="Pull down to try again"
          />
        </View>
      ) : (
          <FlashList
          data={workoutTypes ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {ListHeaderComponent}
            </View>
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <EmptyState
                isScanning={false}
                message="No workout types available"
                subMessage="Check back later"
              />
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={tintColor}
            />
          }
          ItemSeparatorComponent={null}
        />
      )}
    </ThemedView>
  );
}

const createThemedStyles = () => {
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const shadowColor = useThemeColor({ light: "#000000", dark: "#000000" }, "text");

  return StyleSheet.create({
    section: {
      marginTop: 24,
      backgroundColor: cardColor,
      borderRadius: 10,
      marginHorizontal: 16,
      overflow: "hidden",
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2.5,
      elevation: 1,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: borderColor,
    },
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listHeader: {
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: 32,
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
  },
});
