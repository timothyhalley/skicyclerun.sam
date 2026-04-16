import {
  PinpointSMSVoiceV2Client,
  SendNotifyTextMessageCommand,
} from "@aws-sdk/client-pinpoint-sms-voice-v2";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.AWS_REGION || "us-west-2";
const NOTIFY_CONFIG_ID = process.env.NOTIFY_CONFIGURATION_ID;
const FROM_EMAIL = process.env.FROM_EMAIL; // Your verified SES email
const USER_POOL_ID =
  process.env.USER_POOL_ID ||
  process.env.USER_POOL_ARN?.split("/")?.[1] ||
  null;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const smsClient = new PinpointSMSVoiceV2Client({ region: REGION });
const sesClient = new SESv2Client({ region: REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

// Simple in-memory OTP storage (use DynamoDB for production)
const otpStore = new Map();

function getOriginHeader(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  if (!origin) {
    return ALLOWED_ORIGINS[0] || "https://localhost:4321";
  }
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return ALLOWED_ORIGINS[0] || "https://localhost:4321";
}

function json(event, statusCode, body) {
  const origin = getOriginHeader(event);
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "OPTIONS,POST",
      "access-control-allow-credentials": "true",
      vary: "Origin",
    },
    body: JSON.stringify(body),
  };
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isEmail(input) {
  return input && input.includes("@");
}

async function sendSMSOTP(phoneNumber) {
  const otp = generateOTP();

  // Store OTP with 5-minute expiry
  otpStore.set(phoneNumber, { otp, expires: Date.now() + 300000 });

  const command = new SendNotifyTextMessageCommand({
    NotifyConfigurationId: NOTIFY_CONFIG_ID,
    DestinationPhoneNumber: phoneNumber,
    TemplateVariables: {
      code: otp,
    },
  });

  await smsClient.send(command);
  return { success: true, message: "SMS OTP sent successfully" };
}

async function sendEmailOTP(email) {
  console.log("Starting sendEmailOTP for:", email);
  console.log("FROM_EMAIL:", FROM_EMAIL);

  const otp = generateOTP();
  console.log("Generated OTP:", otp);

  // Store OTP with 5-minute expiry
  otpStore.set(email, { otp, expires: Date.now() + 300000 });

  const emailContent = {
    Simple: {
      Subject: {
        Data: "Your Verification Code",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: `
            <html>
              <body>
                <h2>SkiCycleRun: Your Verification Code</h2>
                <p>Your OTP code is: <strong>${otp}</strong></p>
                <p>This code will expire in 5 minutes.</p>
              </body>
            </html>
          `,
          Charset: "UTF-8",
        },
        Text: {
          Data: `SkiCycleRun: Your verification code is: ${otp}. This code will expire in 5 minutes.`,
          Charset: "UTF-8",
        },
      },
    },
  };

  const command = new SendEmailCommand({
    FromEmailAddress: FROM_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Content: emailContent,
  });

  console.log("Sending email command:", JSON.stringify(command, null, 2));

  try {
    const result = await sesClient.send(command);
    console.log("SES send result:", JSON.stringify(result, null, 2));
    return { success: true, message: "Email OTP sent successfully" };
  } catch (error) {
    console.error("SES send error:", error);
    throw error;
  }
}

function parseBody(event) {
  if (!event?.body) return {};
  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

function getAttribute(attributes, name) {
  const found = attributes?.find((attr) => attr?.Name === name);
  return found?.Value ?? null;
}

async function findUsernameByRecipient(recipient) {
  if (!USER_POOL_ID || !recipient) return null;

  const filter = isEmail(recipient)
    ? `email = \"${recipient}\"`
    : `phone_number = \"${recipient}\"`;

  const listUsers = await cognitoClient.send(
    new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: filter,
      Limit: 1,
    }),
  );

  return listUsers?.Users?.[0]?.Username || recipient;
}

async function getCognitoUserProfile(recipient) {
  if (!USER_POOL_ID) {
    return {
      lookupWarning: "USER_POOL_ID is not configured",
    };
  }

  const username = await findUsernameByRecipient(recipient);
  if (!username) {
    return {
      lookupWarning: "Cognito user not found for recipient",
    };
  }

  const [userData, groupData] = await Promise.all([
    cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      }),
    ),
    cognitoClient.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      }),
    ),
  ]);

  const attributes = userData?.UserAttributes || [];
  const email = getAttribute(attributes, "email");
  const phone = getAttribute(attributes, "phone_number");
  const zoneinfo = getAttribute(attributes, "zoneinfo");
  const customLocation = getAttribute(attributes, "custom:location");
  const name = getAttribute(attributes, "name");

  return {
    sub: getAttribute(attributes, "sub"),
    username,
    name,
    email,
    emailPopulated: !!(email && email.trim()),
    phone,
    zoneinfo,
    location: customLocation,
    groups: (groupData?.Groups || []).map((group) => group?.GroupName).filter(Boolean),
    createdTime: userData?.UserCreateDate
      ? userData.UserCreateDate.toISOString()
      : null,
    lastUpdatedTime: userData?.UserLastModifiedDate
      ? userData.UserLastModifiedDate.toISOString()
      : null,
    userStatus: userData?.UserStatus || null,
    enabled: typeof userData?.Enabled === "boolean" ? userData.Enabled : null,
  };
}

export const handler = async (event) => {
  const method =
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    event?.requestContext?.httpMethod;

  if (method === "OPTIONS") {
    return json(event, 204, {});
  }

  const body = parseBody(event);
  const path =
    event?.rawPath || event?.path || event?.requestContext?.path || "";

  const action =
    body?.action ||
    (path.endsWith("/auth/send-otp")
      ? "send"
      : path.endsWith("/auth/verify-otp")
        ? "verify"
        : undefined);

  const recipient = body?.phoneNumber || body?.email || body?.username;
  const otp = body?.otp || body?.code;

  try {
    if (action === "send") {
      if (!recipient) {
        return json(event, 400, {
          success: false,
          error: "phoneNumber or email is required",
        });
      }

      let result;
      if (isEmail(recipient)) {
        result = await sendEmailOTP(recipient);
      } else {
        result = await sendSMSOTP(recipient);
      }

      return json(event, 200, result);
    }

    if (action === "verify") {
      if (!recipient || !otp) {
        return json(event, 400, {
          success: false,
          error: "recipient (phoneNumber or email) and otp are required",
        });
      }

      const stored = otpStore.get(recipient);
      if (stored && stored.otp === String(otp) && Date.now() < stored.expires) {
        otpStore.delete(recipient);

        let profileResponse = {};
        try {
          profileResponse = await getCognitoUserProfile(recipient);
        } catch (profileError) {
          console.error("Failed to fetch Cognito user profile:", profileError);
          profileResponse = {
            lookupWarning: "OTP verified, but failed to fetch Cognito profile",
          };
        }

        return json(event, 200, {
          success: true,
          verified: true,
          ...profileResponse,
        });
      }

      return json(event, 400, {
        success: false,
        error: "Invalid or expired OTP",
      });
    }

    return json(event, 400, {
      success: false,
      error: "action must be send or verify",
    });
  } catch (err) {
    return json(event, 500, {
      success: false,
      error: err?.name || "InternalError",
      message: err?.message || "Unexpected error",
    });
  }
};
