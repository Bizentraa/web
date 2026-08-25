export class BusinessAccessError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INVALID_INPUT",
    message: string,
  ) {
    super(message);
    this.name = "BusinessAccessError";
  }
}
