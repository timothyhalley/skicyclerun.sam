import {
  PinpointSMSVoiceV2Client,
  SendNotifyTextMessageCommand,
} from "@aws-sdk/client-pinpoint-sms-voice-v2";

const REGION = process.env.AWS_REGION || "us-west-2";
const NOTIFY_CONFIG_ID = process.env.NOTIFY_CONFIGURATION_ID;

const smsClient = new PinpointSMSVoiceV2Client({ region: REGION });

// Simple in-memory OTP storage (use DynamoDB for production)
const otpStore = new Map();

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

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendNotifyOTP(phoneNumber) {
  const otp = generateOTP();

  // Store OTP with 5-minute expiry
  otpStore.set(phoneNumber, { otp, expires: Date.now() + 300000 });

  const command = new SendNotifyTextMessageCommand({
    NotifyConfigurationId: NOTIFY_CONFIG_ID,
    DestinationPhoneNumber: phoneNumber,
    TemplateVariables: {
      code: otp
    }
    // TemplateId will use the default template from your configuration
  });

  await smsClient.send(command);
  return { success: true, message: "OTP sent successfully" };
}

function parseBody(event) {
  if (!event?.body) return {};
  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

export const handler = async (event) => {
  if (event?.requestContext?.http?.method === "OPTIONS") {
    return json(200, { ok: true });
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
  const phoneNumber = body?.phoneNumber || body?.username;
  const otp = body?.otp || body?.code;

  try {
    if (action === "send") {
      if (!phoneNumber) {
        return json(400, { success: false, error: "phoneNumber is required" });
      }
      const result = await sendNotifyOTP(phoneNumber);
      return json(200, result);
    }

    if (action === "verify") {
      if (!phoneNumber || !otp) {
        return json(400, {
          success: false,
          error: "phoneNumber and otp are required",
        });
      }

      const stored = otpStore.get(phoneNumber);
      if (stored && stored.otp === String(otp) && Date.now() < stored.expires) {
        otpStore.delete(phoneNumber);
        return json(200, { success: true, verified: true });
      }

      return json(400, {
        success: false,
        error: "Invalid or expired OTP",
      });
    }

    return json(400, {
      success: false,
      error: "action must be send or verify",
    });
  } catch (err) {
    return json(500, {
      success: false,
      error: err?.name || "InternalError",
      message: err?.message || "Unexpected error",
    });
  }
};
