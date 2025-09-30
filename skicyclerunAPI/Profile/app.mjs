const ok = (origin, body) => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  },
  body: JSON.stringify(body),
});
const err = (origin, code, message) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  },
  body: JSON.stringify({ error: message }),
});

export const lambdaHandler = async (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",");
  const allow = origin && allowed.includes(origin) ? origin : allowed[0] || "*";
  const claims = event?.requestContext?.authorizer?.claims;
  if (!claims) return err(allow, 401, "Unauthorized");
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
  return ok(allow, { sub, email, groups });
};
