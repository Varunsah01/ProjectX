// Sunset is set to 2026-05-01 + 90 days. Update this constant when the
// deprecation window is renewed.
export const LEGACY_MOBILE_API_SUNSET = "Thu, 30 Jul 2026 00:00:00 GMT";

type RouteHandler<TContext> = (
  request: Request,
  context: TContext,
) => Promise<Response> | Response;

export function withDeprecation<TContext>(
  handler: RouteHandler<TContext>,
): RouteHandler<TContext> {
  return async (request, context) => {
    const upstream = await handler(request, context);
    const response = new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
    response.headers.set("Deprecation", "true");
    response.headers.set("Sunset", LEGACY_MOBILE_API_SUNSET);
    return response;
  };
}
