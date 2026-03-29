declare module "bash-parser" {
  function parse(
    source: string,
    options?: { mode?: "bash" | "posix" | "word-expansion" },
  ): unknown;
  export = parse;
}
