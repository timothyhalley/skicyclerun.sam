const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const ok = (origin, body) => ({
  statusCode: 200,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});
const err = (origin, code, message) => ({
  statusCode: code,
  headers: CORS_HEADERS,
  body: JSON.stringify({ error: message }),
});

export const lambdaHandler = async (event) => {
  const origin = null;
  const claims = event?.requestContext?.authorizer?.claims;
  const emailParam = event?.queryStringParameters?.email;

  if (!claims || !emailParam || claims.email !== emailParam) {
    return err(origin, 401, "Unauthorized or mismatched email");
  }

  const rawGroups = claims["cognito:groups"];
  const groups = Array.isArray(rawGroups)
    ? rawGroups
    : typeof rawGroups === "string" && rawGroups.trim()
    ? rawGroups.split(",").map((s) => s.trim())
    : [];

  const sub = claims.sub || null;
  const email = claims.email || null;

  // Optional enrichment
  const phone = claims.phone_number || null;
  const geo = claims["custom:geo"] || null;

  return ok(origin, { sub, email, groups, phone, geo });
};
