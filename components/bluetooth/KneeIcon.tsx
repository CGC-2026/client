import { Image } from "react-native";

interface KneeIconProps {
  size?: number;
}

export default function KneeIcon({ size = 60 }: KneeIconProps) {
  return (
    <Image
      source={require("@/components/assets/knee.png")}
      style={{ width: size, height: size }}
    />
  );
}
