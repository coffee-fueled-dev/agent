import { createContext, type ReactNode, useContext, useMemo } from "react";

type PublicEnv = { convexUrl: string; accountToken: string };
const emptyPublicEnv: PublicEnv = { convexUrl: "", accountToken: "" };

const PublicEnvContext = createContext<PublicEnv | null>(null);

export function PublicEnvProvider({
  value: valueProp,
  children,
}: {
  value?: PublicEnv;
  children: ReactNode;
}) {
  const value = useMemo(() => valueProp ?? emptyPublicEnv, [valueProp]);
  return (
    <PublicEnvContext.Provider value={value}>
      {children}
    </PublicEnvContext.Provider>
  );
}

export function usePublicEnv(): PublicEnv {
  const ctx = useContext(PublicEnvContext);
  if (!ctx) {
    throw new Error("usePublicEnv must be used within PublicEnvProvider");
  }
  return ctx;
}
