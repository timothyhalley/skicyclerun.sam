import { getCorsHeaders, handleOptionsRequest } from "./cors.mjs";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-west-2",
});

const ok = (origin, body) => ({
  statusCode: 200,
  headers: getCorsHeaders(origin),
  body: JSON.stringify(body),
});
const err = (origin, code, message) => ({
  statusCode: code,
  headers: getCorsHeaders(origin),
  body: JSON.stringify({ error: message }),
});

export const lambdaHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === "OPTIONS") {
    return handleOptionsRequest(event);
  }
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
  const emailVerified =
    claims.email_verified === "true" || claims.email_verified === true;
  const phone = claims.phone_number || null;
  const phoneVerified =
    claims.phone_number_verified === "true" ||
    claims.phone_number_verified === true;
  const zoneInfo = claims.zoneinfo || null;
  const authTime = claims.auth_time
    ? new Date(claims.auth_time * 1000).toISOString()
    : null;

  // Get additional user attributes from Cognito (like UserCreateDate)
  let memberSince = null;
  let userStatus = null;
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: process.env.USER_POOL_ID || "us-west-2_nkPiRBTSr",
      Username: claims.username || sub,
    });
    const userData = await cognitoClient.send(command);
    memberSince = userData.UserCreateDate
      ? userData.UserCreateDate.toISOString()
      : null;
    userStatus = userData.UserStatus || null;
  } catch (error) {
    console.error("Failed to fetch user details from Cognito:", error);
    // Continue without these fields rather than failing the request
  }

  return ok(origin, {
    sub,
    email,
    emailVerified,
    phone,
    phoneVerified,
    location: zoneInfo,
    groups,
    memberSince,
    lastLogin: authTime,
    userStatus,
  });
};
