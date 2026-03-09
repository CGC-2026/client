import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, Text, View } from "react-native";

type ActiveRepCounterProps = {
  count: number;
};

export default function ActiveRepCounter({ count }: ActiveRepCounterProps) {
  const tintColor = useThemeColor({}, "tint");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={styles.container}>
      <Text style={[styles.count, { color: tintColor }]}>{count}</Text>
      <Text style={[styles.label, { color: textSecondary }]}>reps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontSize: 96,
    fontWeight: "700",
    lineHeight: 104,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 4,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
