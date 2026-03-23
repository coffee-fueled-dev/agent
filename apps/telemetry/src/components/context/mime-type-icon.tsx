import {
  ArchiveIcon,
  FileCodeIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  ScanTextIcon,
} from "lucide-react";
import type { Accept } from "react-dropzone";

export type Mime = keyof typeof MIME_TYPES;

const TEXT_FILES = {
  "text/plain": [".txt"],
  "text/markdown": [".md", ".markdown"],
  "text/csv": [".csv"],
  "text/tab-separated-values": [".tsv"],
  "text/html": [".html", ".htm"],
  "text/css": [".css"],
  "application/json": [".json"],
  "application/javascript": [".js"],
  "text/javascript": [".js"],
  "application/typescript": [".ts"],
  "application/xml": [".xml"],
  "text/xml": [".xml"],
} as const satisfies Accept;

const DOCUMENT_FILES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],
  "application/rtf": [".rtf"],
  "application/vnd.oasis.opendocument.text": [".odt"],
  "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
  "application/vnd.oasis.opendocument.presentation": [".odp"],
} as const satisfies Accept;

const IMAGE_FILES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
  "image/bmp": [".bmp"],
  "image/tiff": [".tiff", ".tif"],
} as const satisfies Accept;

const ARCHIVE_FILES = {
  "application/zip": [".zip"],
  "application/x-tar": [".tar"],
  "application/gzip": [".gz"],
  "application/x-7z-compressed": [".7z"],
} as const satisfies Accept;

const CODE_FILES = {
  "application/x-python": [".py"],
  "text/x-python": [".py"],
  "application/x-java": [".java"],
  "text/x-java": [".java"],
  "application/x-c": [".c"],
  "text/x-c": [".c"],
  "application/x-c++": [".cpp", ".cc", ".cxx"],
  "text/x-c++": [".cpp", ".cc", ".cxx"],
  "application/x-csharp": [".cs"],
  "text/x-csharp": [".cs"],
  "application/x-php": [".php"],
  "text/x-php": [".php"],
  "application/x-ruby": [".rb"],
  "text/x-ruby": [".rb"],
  "application/x-go": [".go"],
  "text/x-go": [".go"],
  "application/x-rust": [".rs"],
  "text/x-rust": [".rs"],
  "application/x-swift": [".swift"],
  "text/x-swift": [".swift"],
  "application/x-kotlin": [".kt"],
  "text/x-kotlin": [".kt"],
  "application/x-scala": [".scala"],
  "text/x-scala": [".scala"],
  "application/x-shell": [".sh", ".bash"],
  "text/x-shell": [".sh", ".bash"],
  "application/x-yaml": [".yml", ".yaml"],
  "text/x-yaml": [".yml", ".yaml"],
  "application/toml": [".toml"],
  "text/x-toml": [".toml"],
} as const satisfies Accept;

// Default accepted file types
export const MIME_TYPES = {
  ...TEXT_FILES,
  ...DOCUMENT_FILES,
  ...IMAGE_FILES,
  ...ARCHIVE_FILES,
  ...CODE_FILES,
} as const satisfies Accept;

export function MimeTypeIcon({
  mimeType,
  ...props
}: { mimeType?: string } & React.ComponentProps<"svg">) {
  if (!mimeType) return <ScanTextIcon {...props} />;
  if (mimeType in TEXT_FILES) return <FileTextIcon {...props} />;
  if (mimeType in DOCUMENT_FILES) return <FileIcon {...props} />;
  if (mimeType in IMAGE_FILES) return <FileImageIcon {...props} />;
  if (mimeType in ARCHIVE_FILES) return <ArchiveIcon {...props} />;
  if (mimeType in CODE_FILES) return <FileCodeIcon {...props} />;
  return <FileIcon {...props} />;
}
