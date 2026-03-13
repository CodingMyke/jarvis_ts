import type { ZodError } from "zod";

export function getZodErrorMessage(error: ZodError): string {
  const [issue] = error.issues;

  if (!issue) {
    return "Payload non valido";
  }

  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}
