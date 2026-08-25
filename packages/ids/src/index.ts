import { randomUUID } from "node:crypto";

export function createId(): string {
  return randomUUID();
}

export function requireId(value: string, label = "ID"): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} must be a UUID.`);
  }

  return value;
}
