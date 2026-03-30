/** Max chars of attached file text included in the lexical search query (deterministic, no LLM). */
export const LEXICAL_FILE_SNIPPET_MAX = 2048;

/**
 * First {@link LEXICAL_FILE_SNIPPET_MAX} characters of file text for fulltext query terms
 * (rare tokens in intros, etc.). Does not re-index the file; only shapes the query string.
 */
export function lexicalSnippetFromFileText(fileText: string): string {
  const t = fileText.trim();
  if (!t) return "";
  if (t.length <= LEXICAL_FILE_SNIPPET_MAX) return t;
  return t.slice(0, LEXICAL_FILE_SNIPPET_MAX).trimEnd();
}

/**
 * Fixed recipe for hybrid lexical arm: filename, user-typed query, optional file body snippet.
 */
export function buildLexicalContextQuery(opts: {
  userQuery: string;
  fileName?: string | null;
  fileText?: string | null;
}): string {
  const parts: string[] = [];
  const name = opts.fileName?.trim();
  if (name) parts.push(name);
  const q = opts.userQuery.trim();
  if (q) parts.push(q);
  const snippet = opts.fileText?.trim()
    ? lexicalSnippetFromFileText(opts.fileText)
    : "";
  if (snippet) parts.push(snippet);
  return parts.join("\n\n");
}

/**
 * Multiple attached files: one lexical block per file (same recipe as single-file),
 * prefixed by the user query once.
 */
export function buildLexicalContextQueryMulti(opts: {
  userQuery: string;
  files: { fileName: string; fileText?: string | null }[];
}): string {
  const parts: string[] = [];
  const q = opts.userQuery.trim();
  if (q) parts.push(q);
  for (const f of opts.files) {
    const block = buildLexicalContextQuery({
      userQuery: "",
      fileName: f.fileName,
      fileText: f.fileText ?? null,
    });
    if (block.trim()) parts.push(block);
  }
  return parts.join("\n\n");
}
