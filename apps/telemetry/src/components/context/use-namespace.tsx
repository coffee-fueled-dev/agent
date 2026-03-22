import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";
import { useContextFilters } from "./use-context-filters";

type NamespaceContextValue = {
  namespace: string;
  setNamespace: (namespace: string) => void;
  displayName: string;
};

const NamespaceContext = createContext<NamespaceContextValue | null>(null);

export function NamespaceProvider({
  children,
}: PropsWithChildren<{
  namespace?: string;
}>) {
  const filters = useContextFilters();

  const value = useMemo(
    () => ({
      namespace: filters.namespace,
      setNamespace: filters.setNamespace,
      displayName: filters.displayName,
    }),
    [filters.displayName, filters.namespace, filters.setNamespace],
  );

  return (
    <NamespaceContext.Provider value={value}>
      {children}
    </NamespaceContext.Provider>
  );
}

export function useNamespace() {
  const context = useContext(NamespaceContext);
  if (!context) {
    throw new Error("useNamespace must be used within NamespaceProvider");
  }
  return context;
}
