/**
 * CC-P1-011: a dependency-free delimited-file reader for import templates.
 *
 * It understands quoted values, escaped quotes, embedded newlines and both CRLF and LF files, so a
 * spreadsheet exported as CSV/TSV can be validated before anything is written to the Business.
 */
export interface DelimitedFile {
  columns: string[];
  rows: Array<Record<string, string>>;
}

export function parseDelimited(content: string, delimiter = ","): DelimitedFile {
  const records = splitRecords(content, delimiter);
  const [header, ...body] = records;
  if (!header) return { columns: [], rows: [] };

  const columns = header.map((value) => value.trim());
  const rows = body
    .filter((record) => record.some((value) => value.trim() !== ""))
    .map((record) => {
      const row: Record<string, string> = {};
      columns.forEach((column, index) => {
        row[column] = (record[index] ?? "").trim();
      });
      return row;
    });

  return { columns, rows };
}

function splitRecords(content: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  const text = content.replace(/^\uFEFF/, "");

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }
    if (character === delimiter) {
      current.push(value);
      value = "";
      continue;
    }
    if (character === "\r") continue;
    if (character === "\n") {
      current.push(value);
      records.push(current);
      current = [];
      value = "";
      continue;
    }
    value += character ?? "";
  }

  if (value !== "" || current.length) {
    current.push(value);
    records.push(current);
  }

  return records;
}

export function requiredColumns(file: DelimitedFile, expected: readonly string[]): string[] {
  const present = new Set(file.columns.map((column) => column.toLowerCase()));
  return expected.filter((column) => !present.has(column.toLowerCase()));
}
