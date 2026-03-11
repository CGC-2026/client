import { useThemeColor } from "@/hooks/useThemeColor";
import { WorkoutType } from "@/types/workout.types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type WorkoutTypeListItemProps = {
  workoutType: WorkoutType;
  onPress: (workoutType: WorkoutType) => void;
  disabled?: boolean;
};

export default function WorkoutTypeListItem({
  workoutType,
  onPress,
  disabled = false,
}: WorkoutTypeListItemProps) {
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const cardColor = useThemeColor({}, "card");
  const cardPressedColor = useThemeColor({}, "cardPressed");
  const iconColor = useThemeColor({}, "icon");
  const tintColor = useThemeColor({}, "tint");

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { borderBottomColor: borderColor, backgroundColor: cardColor },
        pressed && !disabled ? { backgroundColor: cardPressedColor } : {},
        disabled ? styles.disabled : {},
      ]}
      onPress={() => onPress(workoutType)}
      disabled={disabled}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="barbell-outline"
          size={24}
          color={disabled ? iconColor : tintColor}
        />
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.name, { color: disabled ? textSecondary : textColor }]}
          numberOfLines={1}
        >
          {workoutType.name}
        </Text>
        {workoutType.description ? (
          <Text
            style={[styles.description, { color: textSecondary }]}
            numberOfLines={2}
          >
            {workoutType.description}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  disabled: {
    opacity: 0.45,
  },
  iconContainer: {
    width: 36,
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: "500",
  },
  description: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});
