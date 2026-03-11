import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, Text, View } from "react-native";

type CompletedSetRowProps = {
  setNumber: number;
  repCount: number;
  isLast: boolean;
};

export default function CompletedSetRow({ setNumber, repCount, isLast }: CompletedSetRowProps) {
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "divider");

  return (
    <View style={[styles.row, !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.setLabel, { color: textSecondary }]}>Set {setNumber}</Text>
      <Text style={[styles.repCount, { color: textColor }]}>
        {repCount} {repCount === 1 ? "rep" : "reps"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  setLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  repCount: {
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
