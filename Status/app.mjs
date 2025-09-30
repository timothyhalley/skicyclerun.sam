export const lambdaHandler = async (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",");
  const allow = origin && allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    },
    body: JSON.stringify({ ok: true, ts: Date.now() }),
  };
};
