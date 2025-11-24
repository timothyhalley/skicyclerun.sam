import { getCorsHeaders, handleOptionsRequest } from "./cors.mjs";

export const lambdaHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === "OPTIONS") {
    return handleOptionsRequest(event);
  }

  return {
    statusCode: 200,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({ ok: true, ts: Date.now() }),
  };
};
