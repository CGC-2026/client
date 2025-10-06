import { MenuView } from '@react-native-menu/menu';
import React, { createContext, useCallback, useContext } from 'react';
import type { MenuAction, MenuContextType } from './Menu.Provider';

const IOSMenuContext = createContext<MenuContextType | null>(null);

export function IOSMenuProvider({ children }: { children: React.ReactNode }) {
  const createContextMenu = useCallback((props: {
    title?: string;
    actions: MenuAction[];
    onPressAction: (id: string) => void;
    children: React.ReactNode;
  }) => {
    return (
      <MenuView
        title={props.title || ''}
        actions={props.actions}
        onPressAction={({ nativeEvent }) => {
          // nativeEvent contains event which is the action ID
          if (nativeEvent?.event) {
            props.onPressAction(nativeEvent.event);
          }
        }}
      >
        {props.children}
      </MenuView>
    );
  }, []);

  const value: MenuContextType = {
    createContextMenu,
  };

  return (
    <IOSMenuContext.Provider value={value}>
      {children}
    </IOSMenuContext.Provider>
  );
}

export function useIOSMenu(): MenuContextType {
  const context = useContext(IOSMenuContext);
  if (!context) {
    throw new Error('useIOSMenu must be used within an IOSMenuProvider');
  }
  return context;
}
