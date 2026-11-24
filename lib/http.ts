import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** An error that maps directly to an HTTP response. Thrown from lib code, caught by `route()`. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthorized = (msg = "Please sign in to continue.") => new HttpError(401, msg, "unauthorized");
export const forbidden = (msg = "You don't have permission to do that.") => new HttpError(403, msg, "forbidden");
export const notFound = (msg = "Not found.") => new HttpError(404, msg, "not_found");
export const badRequest = (msg: string) => new HttpError(400, msg, "bad_request");

export function errorResponse(status: number, message: string, code?: string, details?: unknown) {
  return NextResponse.json({ error: { message, code, details } }, { status });
}

/**
 * Wraps a route handler so every route returns the same JSON error shape:
 *   { error: { message, code, details? } }
 */
export function route<Ctx>(handler: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err.status, err.message, err.code);
      if (err instanceof ZodError) {
        const first = err.issues[0];
        const where = first?.path.length ? `${first.path.join(".")}: ` : "";
        return errorResponse(400, `${where}${first?.message ?? "Invalid input"}`, "validation_error", err.flatten());
      }
      console.error("[api] unhandled error", err);
      return errorResponse(500, "Something went wrong on our side. Please try again.", "internal_error");
    }
  };
}

/** Parse a JSON body; a malformed body becomes a 400 instead of a 500. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}
