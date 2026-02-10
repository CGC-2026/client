import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import { WorkoutType } from "@/types/workout.types";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface WorkoutTypeCardProps {
  workoutType: WorkoutType;
  onPress: (workoutType: WorkoutType) => void;
  disabled?: boolean;
  isActive?: boolean;
}

export const WorkoutTypeCard: React.FC<WorkoutTypeCardProps> = ({
  workoutType,
  onPress,
  disabled = false,
  isActive = false,
}) => {
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");

  const getIconForWorkout = (name: string) => {
    switch (name.toLowerCase()) {
      case "squats":
        return "figure.strengthtraining.traditional" as const;
      case "running":
        return "figure.run" as const;
      default:
        return "figure.mixed.cardio" as const;
    }
  };

  return (
    <Pressable
      onPress={() => !disabled && onPress(workoutType)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        {
          borderColor: isActive ? "#FF3B30" : borderColor,
          borderWidth: isActive ? 2 : 1,
          backgroundColor,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        isActive && styles.active,
      ]}
    >
      {isActive && (
        <View style={styles.activeBadge}>
          <View style={[styles.activeDot, { backgroundColor: "#FF3B30" }]} />
          <ThemedText style={styles.activeBadgeText}>ACTIVE</ThemedText>
        </View>
      )}

      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: disabled
              ? "rgba(150, 150, 150, 0.1)"
              : isActive
                ? "rgba(255, 59, 48, 0.15)"
                : tintColor + "20",
          },
        ]}
      >
        <IconSymbol
          name={getIconForWorkout(workoutType.name)}
          size={28}
          color={disabled ? "#666" : isActive ? "#FF3B30" : tintColor}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText style={[styles.title, isActive && { color: "#FF3B30" }]}>
            {workoutType.name}
          </ThemedText>
        </View>

        {workoutType.description && (
          <ThemedText style={styles.description} numberOfLines={2}>
            {workoutType.description}
          </ThemedText>
        )}
      </View>

      {!disabled && !isActive && (
        <View style={styles.arrowContainer}>
          <IconSymbol name="chevron.right" size={16} color="#ccc" />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.6,
    backgroundColor: "rgba(150, 150, 150, 0.03)",
  },
  active: {
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: "rgba(255, 59, 48, 0.03)",
  },
  activeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    zIndex: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: 8,
  },
});
