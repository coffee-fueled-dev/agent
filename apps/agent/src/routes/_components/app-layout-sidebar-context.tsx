"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useMemo,
} from "react";
import { useLocalStorage } from "usehooks-ts";

const APP_LAYOUT_INNER_SIDEBAR_STORAGE_KEY =
  "agent_app_layout_inner_sidebar_visible";

type AppLayoutSidebarContextValue = {
  innerSidebarVisible: boolean;
  setInnerSidebarVisible: Dispatch<SetStateAction<boolean>>;
  toggleInnerSidebarVisible: () => void;
};

const AppLayoutSidebarContext =
  createContext<AppLayoutSidebarContextValue | null>(null);

export function AppLayoutSidebarProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [innerSidebarVisible, setInnerSidebarVisible] = useLocalStorage(
    APP_LAYOUT_INNER_SIDEBAR_STORAGE_KEY,
    false,
  );

  const value = useMemo<AppLayoutSidebarContextValue>(
    () => ({
      innerSidebarVisible,
      setInnerSidebarVisible,
      toggleInnerSidebarVisible: () =>
        setInnerSidebarVisible((visible) => !visible),
    }),
    [innerSidebarVisible, setInnerSidebarVisible],
  );

  return (
    <AppLayoutSidebarContext.Provider value={value}>
      {children}
    </AppLayoutSidebarContext.Provider>
  );
}

export function useAppLayoutSidebar() {
  const ctx = useContext(AppLayoutSidebarContext);
  if (!ctx) {
    throw new Error(
      "useAppLayoutSidebar must be used within AppLayoutSidebarProvider",
    );
  }
  return ctx;
}
