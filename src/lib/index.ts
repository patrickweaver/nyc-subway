// place files you want to import through the `$lib` alias in this folder.

import type { ZodError } from "zod";

export function isErrorWithMessage(error: { message: string } | unknown): error is { message: string } {
    return (error as { message: string }).message !== undefined;
}

export function isZodValidationError(error: ZodError | unknown): error is ZodError {
    return (error as ZodError).name === "ZodError"
}