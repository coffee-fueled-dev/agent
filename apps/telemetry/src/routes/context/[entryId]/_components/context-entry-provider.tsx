import { api } from "@backend/api.js";
import {
  useSessionAction,
  useSessionMutation,
} from "convex-helpers/react/sessions";
import type { FunctionReturnType } from "convex/server";
import {
  createContext,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export type ContextEntryDetail = NonNullable<
  FunctionReturnType<typeof api.context.entryQueries.getContextDetail>
>;

export type ContextEntryValue = {
  detail: ContextEntryDetail;
  entryId: string;
  namespace: string;
  isCurrent: boolean;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editText: string;
  setEditText: (v: string) => void;
  resetEditDraft: () => void;
  handleSave: () => Promise<void>;
  saving: boolean;
  handleDelete: () => Promise<void>;
  deleting: boolean;
};

export const ContextEntryContext = createContext<ContextEntryValue | null>(
  null,
);

export function ContextEntryProvider({
  detail,
  entryId,
  namespace,
  children,
}: {
  detail: ContextEntryDetail;
  entryId: string;
  namespace: string;
  children: ReactNode;
}) {
  const deleteAction = useSessionAction(api.context.mutations.deleteContext);
  const editAction = useSessionAction(api.context.mutations.editContext);
  const recordView = useSessionMutation(api.context.mutations.recordContextView);

  const viewIdempotencyRef = useRef<{
    namespace: string;
    entryId: string;
    key: string;
  } | null>(null);
  if (
    viewIdempotencyRef.current === null ||
    viewIdempotencyRef.current.namespace !== namespace ||
    viewIdempotencyRef.current.entryId !== entryId
  ) {
    viewIdempotencyRef.current = {
      namespace,
      entryId,
      key: crypto.randomUUID(),
    };
  }
  const viewIdempotencyKey = viewIdempotencyRef.current.key;

  useEffect(() => {
    void recordView({ namespace, entryId, idempotencyKey: viewIdempotencyKey });
  }, [recordView, namespace, entryId, viewIdempotencyKey]);

  const [deleting, setDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const backHref = `/context?namespace=${encodeURIComponent(namespace)}`;
  const status = detail.version?.data.status ?? "current";
  const isCurrent = status === "current";

  function resetEditDraft() {
    setEditTitle(detail.title ?? "");
    setEditText(detail.fullText || detail.textPreview);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAction({ namespace, entryId });
      window.location.href = backHref;
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await editAction({
        namespace,
        entryId,
        title: editTitle || undefined,
        text: editText,
      });
      window.location.href = `/context/${encodeURIComponent(result.entryId)}?namespace=${encodeURIComponent(namespace)}`;
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }

  return (
    <ContextEntryContext.Provider
      value={{
        detail,
        entryId,
        namespace,
        isCurrent,
        editTitle,
        setEditTitle,
        editText,
        setEditText,
        resetEditDraft,
        handleSave,
        saving,
        handleDelete,
        deleting,
      }}
    >
      {children}
    </ContextEntryContext.Provider>
  );
}
