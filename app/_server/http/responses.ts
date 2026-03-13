import { NextResponse } from "next/server";

export interface ErrorResponseBody {
  success: false;
  error: string;
  message?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

export function jsonOk<T extends object>(body: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(body, { status });
}

export function jsonError(
  status: number,
  body: Omit<ErrorResponseBody, "success">,
): NextResponse<ErrorResponseBody> {
  return NextResponse.json({ success: false, ...body } as ErrorResponseBody, { status });
}
