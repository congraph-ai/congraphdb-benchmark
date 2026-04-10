/**
 * Helper utilities for handling NapiResult types from congraphdb
 *
 * NapiResult<T> is a union type: T | { err: Error }
 * These helpers provide safe unwrapping and error handling.
 */

import type { NapiResult } from 'congraphdb';

/**
 * Error thrown when a NapiResult contains an error
 */
export class NapiResultError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'NapiResultError';
  }
}

/**
 * Unwrap a NapiResult, throwing if it contains an error
 */
export function unwrap<T>(result: NapiResult<T>, context?: string): T {
  if (typeof result === 'object' && result !== null && 'err' in result) {
    const err = result.err;
    throw new NapiResultError(
      context ? `${context}: ${err.message}` : err.message,
      err.code
    );
  }
  return result;
}

/**
 * Unwrap a NapiResult, returning a default value if it contains an error
 */
export function unwrapOr<T>(result: NapiResult<T>, defaultValue: T): T {
  if (typeof result === 'object' && result !== null && 'err' in result) {
    return defaultValue;
  }
  return result;
}

/**
 * Unwrap a NapiResult, returning null if it contains an error
 */
export function unwrapOrNull<T>(result: NapiResult<T>): T | null {
  if (typeof result === 'object' && result !== null && 'err' in result) {
    return null;
  }
  return result;
}

/**
 * Unwrap an async NapiResult (Promise<NapiResult<T>>), throwing if it contains an error
 */
export async function unwrapAsync<T>(promise: Promise<NapiResult<T>>, context?: string): Promise<T> {
  const result = await promise;
  return unwrap(result, context);
}

/**
 * Check if a NapiResult contains an error
 */
export function isError<T>(result: NapiResult<T>): result is { err: Error & { code?: string } } {
  return typeof result === 'object' && result !== null && 'err' in result;
}

/**
 * Extract the error from a NapiResult if present
 */
export function getError<T>(result: NapiResult<T>): Error | undefined {
  if (isError(result)) {
    return result.err;
  }
  return undefined;
}
