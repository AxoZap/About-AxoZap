// Split ordinary SQLite statements without splitting quoted values or comments.
export function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let statement = "";
  let quote = "";
  let comment: "line" | "block" | "" = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];
    if (comment === "line") {
      if (char === "\n") { comment = ""; statement += "\n"; }
      continue;
    }
    if (comment === "block") {
      if (char === "*" && next === "/") { comment = ""; statement += " "; i++; }
      continue;
    }
    if (quote) {
      statement += char;
      if (char === quote) {
        if (next === quote) { statement += next; i++; }
        else quote = "";
      }
      continue;
    }
    if (char === "-" && next === "-") { comment = "line"; statement += " "; i++; }
    else if (char === "/" && next === "*") { comment = "block"; statement += " "; i++; }
    else if (["'", '"', "`", "["].includes(char)) { quote = char === "[" ? "]" : char; statement += char; }
    else if (char === ";") {
      if (statement.trim()) statements.push(statement.trim());
      statement = "";
    } else statement += char;
  }
  if (quote || comment === "block") throw new Error("SQL has an unclosed quote or comment.");
  if (statement.trim()) statements.push(statement.trim());
  if (!statements.length) throw new Error("Paste SQL to run.");
  if (statements.length > 50) throw new Error("Run up to 50 SQL statements at a time.");
  // Trigger bodies contain their own statements and require SQLite's full parser.
  if (statements.some(value => /^CREATE\s+(?:(?:TEMP|TEMPORARY)\s+)?TRIGGER\b/i.test(value))) {
    throw new Error("Run trigger definitions in the Cloudflare D1 console.");
  }
  return statements;
}

export async function readSql(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Paste SQL to run.");
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65_536) { await reader.cancel(); throw new Error("SQL request is too large (maximum 64 KB)."); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally { reader.releaseLock(); }
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { throw new Error("Invalid JSON request."); }
  if (!parsed || typeof parsed !== "object" || !("sql" in parsed) || typeof parsed.sql !== "string") {
    throw new Error("Provide SQL as text.");
  }
  return parsed.sql;
}
