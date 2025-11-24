// Shared CORS utility for all Lambda functions
// Supports multiple origins with credentials

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "https://skicyclerun.com,https://localhost:4321"
).split(",");

/**
 * Get CORS headers for the given request origin
 * @param {string} requestOrigin - The Origin header from the request
 * @returns {Object} CORS headers to include in response
 */
export function getCorsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type,authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

/**
 * Handle OPTIONS preflight request
 * @param {Object} event - API Gateway event
 * @returns {Object} Response for OPTIONS request
 */
export function handleOptionsRequest(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  return {
    statusCode: 200,
    headers: getCorsHeaders(origin),
    body: "",
  };
}
