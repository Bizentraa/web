/** Reads submitted form values without unsafe string coercion. */
export function readText(form: FormData, name: string, fallback = ""): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : fallback;
}

export function readNumber(form: FormData, name: string, fallback = 0): number {
  const value = Number(readText(form, name));
  return Number.isFinite(value) ? value : fallback;
}
