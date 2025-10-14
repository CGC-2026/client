import { useThemeColor } from "@/hooks/useThemeColor";
import { View, Text, StyleSheet } from "react-native";

interface DividerProps {
  text?: string;
}

export default function Divider({ text = "or" }: DividerProps) {
  const styles = createThemedStyles();
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      {text && <Text style={styles.dividerText}>{text}</Text>}
      <View style={styles.dividerLine} />
    </View>
  );
}

export const createThemedStyles = () => {
  const dividerColor = useThemeColor({}, "divider");
  const textColor = useThemeColor({}, "text");
  return StyleSheet.create({
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: dividerColor,
    },
    dividerText: {
      marginHorizontal: 16,
      fontSize: 14,
      color: textColor,
    },
  });
};
