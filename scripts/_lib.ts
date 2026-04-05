export async function pipeChildStream(
  stream: ReadableStream<Uint8Array> | undefined,
  to: typeof process.stdout | typeof process.stderr,
) {
  if (!stream) return;
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      to.write(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function forwardStream(
  stream: ReadableStream<Uint8Array> | undefined,
  sink: { write: (chunk: Uint8Array) => boolean },
  onText: (chunk: string) => void,
) {
  if (!stream) return;
  const reader = stream.getReader();
  const dec = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      sink.write(value);
      onText(dec.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }
}
