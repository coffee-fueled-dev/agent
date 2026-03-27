export type ProjectionPoint = {
  entryId: string;
  key: string;
  title?: string;
  textPreview: string;
  mimeType?: string;
  x: number;
  y: number;
  z: number;
  decayedScore?: number;
  totalAccesses?: number;
  lastAccessTime?: number;
};

export const SCALE = 7;
