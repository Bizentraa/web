/** Small helpers so screens can read a submitted form without unsafe string coercion. */
export function readText(form: FormData, name: string, fallback = ""): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : fallback;
}

export function readOptionalText(form: FormData, name: string): string | undefined {
  const value = readText(form, name);
  return value === "" ? undefined : value;
}

export function readNumber(form: FormData, name: string, fallback = 0): number {
  const value = Number(readText(form, name));
  return Number.isFinite(value) ? value : fallback;
}

export function readOptionalNumber(form: FormData, name: string): number | undefined {
  const raw = readText(form, name);
  if (raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function readBoolean(form: FormData, name: string): boolean {
  return form.get(name) !== null;
}
