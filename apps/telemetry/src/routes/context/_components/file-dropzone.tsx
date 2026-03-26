import { FilePlusIcon } from "lucide-react";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Skeleton } from "../../../components/ui/skeleton.js";

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

  const value = useMemo(
    () => ({
      files,
      limit,
      addFiles: (incoming: File[]) => {
        setFiles(incoming.slice(0, limit));
      },
      removeFile: (name: string) => {
        setFiles((current) => current.filter((file) => file.name !== name));
      },
      clearFiles: () => {
        setFiles([]);
      },
    }),
    [files, limit],
  );

  return (
    <FilesContext.Provider value={value}>{children}</FilesContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FilesContext);
  if (!context) {
    throw new Error("useFiles must be used within FileDropzone");
  }
  return context;
}

export function FileDropzone({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { addFiles, limit } = useFiles();
  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    multiple: limit > 1,
    maxFiles: limit,
    noClick: true,
    onDrop: addFiles,
  });

  return (
    <div {...getRootProps()} className={cn("relative", className)} {...props}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <div
          aria-hidden="true"
          className="rounded-md pointer-events-none fixed inset-0 z-[1000] bg-muted/50 backdrop-blur-sm flex justify-center items-center"
        >
          <Skeleton className="flex items-center gap-2 p-4 rounded-full">
            <FilePlusIcon size={30} className="text-green-600" />
          </Skeleton>
        </div>
      ) : null}
      {children}
    </div>
  );
}
