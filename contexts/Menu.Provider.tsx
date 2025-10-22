import React from "react";
import { Platform } from "react-native";
import { IOSMenuProvider, useIOSMenu } from "./Menu.iOS.Provider";

export type MenuAction = {
  id: string;
  title: string;
  titleColor?: string;
  subtitle?: string;
  image?: string;
  imageColor?: string;
  attributes?: {
    destructive?: boolean;
    disabled?: boolean;
    hidden?: boolean;
  };
  state?: "off" | "on" | "mixed";
  subactions?: MenuAction[];
};

export type MenuContextType = {
  /**
   * Create a menu with the provided actions
   * @param title The menu title (iOS only)
   * @param actions Array of menu actions
   * @param onPressAction Callback when menu item is selected
   * @returns JSX element with the menu
   */
  createContextMenu: (props: {
    title?: string;
    actions: MenuAction[];
    onPressAction: (id: string) => void;
    children: React.ReactNode;
  }) => React.ReactElement;
};

export default function MenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (Platform.OS === "ios") {
    return <IOSMenuProvider>{children}</IOSMenuProvider>;
  } else {
    return <>{children}</>;
  }
}

export const useMenu = (): MenuContextType => {
  if (Platform.OS === "ios") {
    return useIOSMenu();
  } else {
    throw new Error("MenuProvider is not supported on this platform");
  }
};
