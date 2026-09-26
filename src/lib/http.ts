export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const errorResponse = (message: string, status = 400) => json({ error: message }, status);

/** Log unexpected errors and return a generic 500 so internals don't leak to the browser. */
export function serverError(e: unknown) {
  console.error(e);
  return errorResponse('Something went wrong on our end. Please try again, or contact us.', 500);
}
