import { FilePlusIcon } from "lucide-react";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FilesContextValue = {
  files: File[];
  addFiles: (files: File[]) => void;
  removeFile: (name: string) => void;
  clearFiles: () => void;
  limit: number;
};

const FilesContext = createContext<FilesContextValue | null>(null);

export function FileDropzoneProvider({
  children,
  limit = 1,
}: PropsWithChildren<{
  limit?: number;
}>) {
  const [files, setFiles] = useState<File[]>([]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      setFiles((current) => {
        if (limit <= 1) {
          return incoming.slice(0, 1);
        }
        const merged = [...current, ...incoming];
        return merged.slice(0, limit);
      });
    },
    [limit],
  );

  const removeFile = useCallback((name: string) => {
    setFiles((current) => current.filter((file) => file.name !== name));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const value = useMemo(
    () => ({
      files,
      limit,
      addFiles,
      removeFile,
      clearFiles,
    }),
    [files, limit, addFiles, removeFile, clearFiles],
  );

  return (
    <FilesContext.Provider value={value}>{children}</FilesContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FilesContext);
  if (!context) {
    throw new Error("useFiles must be used within FileDropzoneProvider");
  }
  return context;
}

/**
 * Full-viewport file drag capture: while `isDragGlobal` is true, an invisible layer
 * receives drops outside the composer (e.g. over the thread). Interactive UI stays
 * above it via z-index. Disable this instance when another drop zone should win
 * (e.g. memory search modal open).
 */
export function FileDropzone({
  children,
  className,
  disabled = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** When true, drag-and-drop is ignored (e.g. another drop zone should take precedence). */
  disabled?: boolean;
}) {
  const { addFiles, limit } = useFiles();
  const { getInputProps, getRootProps, isDragActive, isDragGlobal } = useDropzone({
    multiple: limit > 1,
    maxFiles: limit,
    noClick: true,
    disabled,
    onDrop: addFiles,
  });

  const showViewportCapture = !disabled && isDragGlobal;

  return (
    <div {...getRootProps({ className: cn("relative", className) })} {...props}>
      <input {...getInputProps()} />
      {showViewportCapture ? (
        <div
          aria-hidden
          className="pointer-events-auto fixed inset-0 z-[5]"
        />
      ) : null}
      <div className="relative z-10 min-w-0">{children}</div>
      {isDragActive ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-muted/50 backdrop-blur-sm"
        >
          <Skeleton className="flex items-center gap-2 rounded-full p-4">
            <FilePlusIcon size={30} className="text-green-600" />
          </Skeleton>
        </div>
      ) : null}
    </div>
  );
}
