import type { FilePart, ImagePart } from "ai";

export function getFileParts(
  url: string,
  mediaType: string,
  filename?: string,
): { filePart: FilePart; imagePart: ImagePart | undefined } {
  const filePart: FilePart = {
    type: "file",
    data: new URL(url),
    mediaType,
    filename,
  };
  const imagePart: ImagePart | undefined = mediaType.startsWith("image/")
    ? { type: "image", image: new URL(url), mediaType }
    : undefined;
  return { filePart, imagePart };
}
