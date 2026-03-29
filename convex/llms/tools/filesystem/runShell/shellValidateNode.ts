"use node";

import parse from "bash-parser";

/**
 * Parses with bash-parser and ensures every invoked command basename is in `whitelist`.
 * Single top-level unit only: one command, pipeline, or && / || chain (no `;` lists).
 */
export function assertWhitelistedShellCommand(
  command: string,
  whitelist: ReadonlySet<string>,
): void {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new Error("Command is empty");
  }
  let ast: { type: string; commands: unknown[] };
  try {
    ast = parse(trimmed, { mode: "bash" }) as {
      type: string;
      commands: unknown[];
    };
  } catch (e) {
    throw new Error(
      e instanceof Error ? `Invalid shell: ${e.message}` : "Invalid shell",
    );
  }
  if (ast.type !== "Script") {
    throw new Error("Expected a shell script");
  }
  if (ast.commands.length !== 1) {
    throw new Error(
      "Only one command, pipeline, or logical chain is allowed (no `;` lists)",
    );
  }
  const names = walkCommandAst(ast.commands[0]);
  for (const name of names) {
    if (!whitelist.has(name)) {
      throw new Error(`Command "${name}" is not allowed`);
    }
  }
}

function wordText(name: unknown): string | null {
  if (
    name &&
    typeof name === "object" &&
    "text" in name &&
    typeof (name as { text: string }).text === "string"
  ) {
    return (name as { text: string }).text;
  }
  return null;
}

function basenameCmd(text: string): string {
  const parts = text.split(/[/\\]/);
  return parts[parts.length - 1] ?? text;
}

function walkCommandAst(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const n = node as Record<string, unknown>;
  switch (n.type) {
    case "Command": {
      const t = wordText(n.name);
      if (!t) {
        throw new Error("Could not determine command name");
      }
      return [basenameCmd(t)];
    }
    case "Pipeline":
      return (n.commands as unknown[]).flatMap(walkCommandAst);
    case "LogicalExpression":
      return [...walkCommandAst(n.left), ...walkCommandAst(n.right)];
    case "Subshell":
    case "CompoundList":
      throw new Error("Subshells and compound lists are not allowed");
    default:
      throw new Error(`Unsupported shell construct: ${String(n.type)}`);
  }
}
