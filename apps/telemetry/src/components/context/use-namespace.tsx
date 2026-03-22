import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";

type NamespaceContextValue = {
  namespace: string;
  setNamespace: (namespace: string) => void;
  displayName: string;
};

const NamespaceContext = createContext<NamespaceContextValue | null>(null);

function getInitialNamespace() {
  if (typeof window === "undefined") {
    return "default";
  }
  const namespace = new URLSearchParams(window.location.search).get(
    "namespace",
  );
  return namespace?.trim() || "default";
}

export function NamespaceProvider({
  children,
  namespace: initialNamespace,
}: PropsWithChildren<{
  namespace?: string;
}>) {
  const [namespace, setNamespace] = useState(
    initialNamespace ?? getInitialNamespace,
  );

  const value = useMemo(
    () => ({
      namespace,
      setNamespace,
      displayName: namespace,
    }),
    [namespace],
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
