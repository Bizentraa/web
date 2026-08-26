export type DomainErrorCode =
  "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INVALID_INPUT" | "NOT_ENABLED";

/**
 * One error type for every Common Core domain service. The API layer maps the code to an
 * HTTP status and shows the message to the User in plain business language.
 */
export class BusinessAccessError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BusinessAccessError";
  }
}
