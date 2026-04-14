const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function getOriginHeader(event) {
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin;
  if (!requestOrigin) {
    return ALLOWED_ORIGINS[0] || "https://localhost:4321";
  }

  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }

  return ALLOWED_ORIGINS[0] || "https://localhost:4321";
}

export const lambdaHandler = async (event) => {
  return {
    statusCode: 204,
    headers: {
      "access-control-allow-origin": getOriginHeader(event),
      "access-control-allow-methods": "OPTIONS,POST",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-credentials": "true",
      "cache-control": "no-store",
      vary: "Origin",
    },
    body: "",
  };
};
