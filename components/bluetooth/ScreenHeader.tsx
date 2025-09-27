import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, Text, View } from "react-native";

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
};

export default function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const textColor = useThemeColor({}, "text");
  
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: textColor }]}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: textColor + "AA" }]}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
});
