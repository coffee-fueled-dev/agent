import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, type ReactNode, useState } from "react";
import { api } from "../../../../../../../convex/_generated/api.js";

export type ContextEntryDetail = NonNullable<
  FunctionReturnType<typeof api.context.contextApi.getContextDetail>
>;

export type ContextEntryValue = {
  detail: ContextEntryDetail;
  entryId: string;
  namespace: string;
  backHref: string;
  isCurrent: boolean;
  editing: boolean;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editText: string;
  setEditText: (v: string) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  handleSave: () => Promise<void>;
  saving: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (v: boolean) => void;
  handleDelete: () => Promise<void>;
  deleting: boolean;
};

export const ContextEntryContext = createContext<ContextEntryValue | null>(null);

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
  const deleteAction = useAction(api.context.contextApi.deleteContext);
  const editAction = useAction(api.context.contextApi.editContext);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const backHref = `/context?namespace=${encodeURIComponent(namespace)}`;
  const status = detail.version?.data.status ?? "current";
  const isCurrent = status === "current";

  function startEditing() {
    setEditTitle(detail.title ?? "");
    setEditText(detail.fullText || detail.textPreview);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
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
        backHref,
        isCurrent,
        editing,
        editTitle,
        setEditTitle,
        editText,
        setEditText,
        startEditing,
        cancelEditing,
        handleSave,
        saving,
        showDeleteDialog,
        setShowDeleteDialog,
        handleDelete,
        deleting,
      }}
    >
      {children}
    </ContextEntryContext.Provider>
  );
}
