const rootEnvPath = new URL("../../.env.local", import.meta.url);

function parseEnvText(text: string) {
  const vars: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .replace(/\s+#.*$/, "")
      .trim();
    vars[key] = value;
  }
  return vars;
}

/** Load package root `.env.local` (required for local dev scaffolding). */
export async function readRootEnv() {
  const file = Bun.file(rootEnvPath);
  if (!(await file.exists())) {
    throw new Error("package root .env.local does not exist");
  }
  const text = await file.text();
  return {
    path: rootEnvPath,
    text,
    vars: parseEnvText(text),
  };
}

export async function writeRootEnvVar(key: string, value: string) {
  const { path, text } = await readRootEnv();
  const lines = text.split(/\r?\n/);
  const nextLine = `${key}=${value}`;
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));

  if (index >= 0) {
    lines[index] = nextLine;
  } else {
    while (lines.length > 0 && lines.at(-1) === "") {
      lines.pop();
    }
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(nextLine);
  }

  await Bun.write(path, `${lines.join("\n")}\n`);
}
