import { useThemeColor } from "@/hooks/useThemeColor";
import { Rep, WorkoutSessionSet } from "@/types/workout.types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import RepRow from "./RepRow";

type SetAccordionItemProps = {
  set: WorkoutSessionSet;
  onRepPress: (rep: Rep, repNumber: number) => void;
};

function formatDuration(start: Date, end: Date): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function SetAccordionItem({
  set,
  onRepPress,
}: SetAccordionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const cardColor = useThemeColor({}, "card");
  const cardPressedColor = useThemeColor({}, "cardPressed");
  const tintColor = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");

  const duration = formatDuration(set.startTime, set.endTime);
  const repCount = set.reps.length;

  return (
    <View style={[styles.container, { borderBottomColor: borderColor }]}>
      <Pressable
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: pressed ? cardPressedColor : cardColor },
        ]}
        onPress={() => setIsExpanded((prev) => !prev)}
      >
        <View style={[styles.setNumber, { backgroundColor: tintColor + "15" }]}>
          <Text style={[styles.setNumberText, { color: tintColor }]}>
            {set.setNumber}
          </Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.setLabel, { color: textColor }]}>
            Set {set.setNumber}
          </Text>
          <Text style={[styles.setMeta, { color: textSecondary }]}>
            {repCount} {repCount === 1 ? "rep" : "reps"} · {duration}
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={iconColor}
        />
      </Pressable>

      {isExpanded && set.reps.length > 0 && (
        <View style={[styles.repsContainer, { borderTopColor: borderColor }]}>
          {set.reps.map((rep, index) => (
            <RepRow
              key={`${set.id}-${rep.repNumber}-${index}`}
              rep={rep}
              repNumber={index + 1}
              onPress={(r) => onRepPress(r, index + 1)}
            />
          ))}
        </View>
      )}

      {isExpanded && set.reps.length === 0 && (
        <View style={[styles.emptyReps, { borderTopColor: borderColor }]}>
          <Text style={[styles.emptyRepsText, { color: textSecondary }]}>
            No reps recorded
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  setNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerContent: {
    flex: 1,
  },
  setLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  setMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  repsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyReps: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emptyRepsText: {
    fontSize: 14,
  },
});
