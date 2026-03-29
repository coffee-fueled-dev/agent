import { api } from "@backend/api.js";
import { useSessionQuery } from "convex-helpers/react/sessions";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

const DEFAULT_NAMESPACE = "default";
const NAMESPACE_EVENT = "context-index-namespace-change";

function getSearchSnapshot() {
  return typeof window === "undefined" ? "" : window.location.search;
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAMESPACE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAMESPACE_EVENT, onChange);
  };
}

function writeNamespace(namespace: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("namespace", namespace.trim() || DEFAULT_NAMESPACE);
  if (url.search === window.location.search) return;
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(NAMESPACE_EVENT));
}

type NamespaceContextValue = {
  namespace: string;
  /**
   * False while `getSessionContextNamespace` is loading. Until true, the URL
   * fallback (`default` / stale) must not be sent to session queries that call
   * `assertAccountNamespace` (race after full-page navigation).
   */
  sessionNamespaceResolved: boolean;
  setNamespace: (ns: string) => void;
};

const NamespaceContext = createContext<NamespaceContextValue | null>(null);

export function NamespaceProvider({ children }: PropsWithChildren) {
  const search = useSyncExternalStore(subscribe, getSearchSnapshot, () => "");
  const urlNamespace = useMemo(
    () =>
      new URLSearchParams(search).get("namespace")?.trim() || DEFAULT_NAMESPACE,
    [search],
  );

  const sessionNamespaceResult = useSessionQuery(
    api.context.sessionNamespace.getSessionContextNamespace,
    {},
  );

  const namespace = useMemo(() => {
    if (sessionNamespaceResult === undefined) return urlNamespace;
    if (sessionNamespaceResult === null) return urlNamespace;
    return sessionNamespaceResult.namespace;
  }, [sessionNamespaceResult, urlNamespace]);

  useEffect(() => {
    if (
      sessionNamespaceResult?.namespace != null &&
      sessionNamespaceResult.namespace !== urlNamespace
    ) {
      writeNamespace(sessionNamespaceResult.namespace);
    }
  }, [sessionNamespaceResult, urlNamespace]);

  const setNamespace = useCallback((ns: string) => writeNamespace(ns), []);

  const sessionNamespaceResolved = sessionNamespaceResult !== undefined;

  const value = useMemo(
    () => ({ namespace, sessionNamespaceResolved, setNamespace }),
    [namespace, sessionNamespaceResolved, setNamespace],
  );

  return (
    <NamespaceContext.Provider value={value}>
      {children}
    </NamespaceContext.Provider>
  );
}

export function useNamespace() {
  const ctx = useContext(NamespaceContext);
  if (!ctx)
    throw new Error("useNamespace must be used within NamespaceProvider");
  return ctx;
}
