import { useState } from "react";
import { cn } from "@/lib/utils";

// Create a files context and a useFiles hook to provide them
// useFiles should have addFile, removeFile, files, limit

export function FileDropzone({ children }: React.PropsWithChildren) {
  return (
    <FileDropzoneProvider>
      <FileDropzoneInner>{children}</FileDropzoneInner>
    </FileDropzoneProvider>
  );
}

function FileDropzoneInner({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  //  Use react dropzone to build an upload component which can wrap any children

  const { addFile } = useFiles({ limit: 1 });

  const [isDragActive, setIsDragActive] = useState(false);

  const dragActiveClasses = "backdrop-blur-sm bg-muted/50 rounded-xl shadow-lg";

  return (
    <div className={cn(dragActiveClasses, className)} {...props}>
      {children}
    </div>
  );
}
