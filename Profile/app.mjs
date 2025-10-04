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
  if (!claims) return err(origin, 401, "Unauthorized");
  let groups = [];
  const rawGroups = claims["cognito:groups"];
  if (Array.isArray(rawGroups)) {
    groups = rawGroups;
  } else if (typeof rawGroups === "string" && rawGroups.trim().length > 0) {
    groups = rawGroups.includes(",")
      ? rawGroups.split(",").map((s) => s.trim())
      : [rawGroups];
  }
  const sub = claims.sub || null;
  const email = claims.email || null;
  return ok(origin, { sub, email, groups });
};
