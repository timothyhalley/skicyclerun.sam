import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.AWS_REGION || "us-west-2";
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const SUPPORTED_CHALLENGES = new Set(["EMAIL_OTP", "SMS_OTP"]);

const cognito = new CognitoIdentityProviderClient({ region: REGION });

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "OPTIONS,POST",
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event?.body) return {};
  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

function getPreferredChallenge(payload) {
  const preferredChallenge = String(
    payload?.preferredChallenge || payload?.challenge || "SMS_OTP",
  ).toUpperCase();

  return SUPPORTED_CHALLENGES.has(preferredChallenge)
    ? preferredChallenge
    : null;
}

function getChallengeResponseKey(challengeName) {
  if (challengeName === "EMAIL_OTP") {
    return "EMAIL_OTP_CODE";
  }

  if (challengeName === "SMS_OTP") {
    return "SMS_OTP_CODE";
  }

  return null;
}

async function sendOtp(payload) {
  const username = payload?.username || payload?.phoneNumber || payload?.phone;
  const preferredChallenge = getPreferredChallenge(payload);

  if (!username) {
    return json(400, { error: "username (or phoneNumber) is required." });
  }

  if (!preferredChallenge) {
    return json(400, {
      error: "preferredChallenge must be EMAIL_OTP or SMS_OTP.",
    });
  }

  if (!USER_POOL_CLIENT_ID) {
    return json(500, {
      error: "Missing USER_POOL_CLIENT_ID environment variable.",
    });
  }

  const response = await cognito.send(
    new InitiateAuthCommand({
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: "USER_AUTH",
      AuthParameters: {
        USERNAME: username,
        PREFERRED_CHALLENGE: preferredChallenge,
      },
    }),
  );

  return json(200, {
    challengeName: response.ChallengeName,
    session: response.Session,
    availableChallenges: response.AvailableChallenges,
    challengeParameters: response.ChallengeParameters,
    metadata: {
      httpStatusCode: response?.$metadata?.httpStatusCode,
      requestId: response?.$metadata?.requestId,
      attempts: response?.$metadata?.attempts,
      totalRetryDelay: response?.$metadata?.totalRetryDelay,
    },
  });
}

async function verifyOtp(payload) {
  const username = payload?.username || payload?.phoneNumber || payload?.phone;
  const session = payload?.session;
  const code = String(payload?.code || "");
  const challengeName = String(payload?.challengeName || "").toUpperCase();
  const challengeResponseKey = getChallengeResponseKey(challengeName);

  if (!username || !session || !code || !challengeName) {
    return json(400, {
      error: "username, session, challengeName, and code are required.",
    });
  }

  if (!challengeResponseKey) {
    return json(400, { error: "challengeName must be EMAIL_OTP or SMS_OTP." });
  }

  if (!USER_POOL_CLIENT_ID) {
    return json(500, {
      error: "Missing USER_POOL_CLIENT_ID environment variable.",
    });
  }

  const response = await cognito.send(
    new RespondToAuthChallengeCommand({
      ClientId: USER_POOL_CLIENT_ID,
      ChallengeName: challengeName,
      Session: session,
      ChallengeResponses: {
        USERNAME: username,
        [challengeResponseKey]: code,
      },
    }),
  );

  const result = response.AuthenticationResult;
  return json(200, {
    challengeName: response.ChallengeName,
    session: response.Session,
    idToken: result?.IdToken,
    accessToken: result?.AccessToken,
    refreshToken: result?.RefreshToken,
    expiresIn: result?.ExpiresIn,
    tokenType: result?.TokenType,
    metadata: {
      httpStatusCode: response?.$metadata?.httpStatusCode,
      requestId: response?.$metadata?.requestId,
      attempts: response?.$metadata?.attempts,
      totalRetryDelay: response?.$metadata?.totalRetryDelay,
    },
  });
}

export const handler = async (event, context) => {
  if (event?.requestContext?.http?.method === "OPTIONS") {
    return json(200, { ok: true });
  }

  try {
    const path = event?.rawPath || "";
    const method =
      event?.requestContext?.http?.method || event?.httpMethod || "POST";
    const body = parseBody(event);

    if (method !== "POST") return json(405, { error: "Method not allowed." });

    if (path.endsWith("/auth/send-otp")) {
      return await sendOtp(body);
    }
    if (path.endsWith("/auth/verify-otp")) {
      return await verifyOtp(body);
    }

    return json(404, { error: "Not found." });
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode || 500;
    return json(status, {
      error: err?.name || "InternalError",
      message: err?.message || "Unexpected error",
      metadata: err?.$metadata
        ? {
            httpStatusCode: err.$metadata.httpStatusCode,
            requestId: err.$metadata.requestId,
            attempts: err.$metadata.attempts,
            totalRetryDelay: err.$metadata.totalRetryDelay,
          }
        : undefined,
    });
  }
};
