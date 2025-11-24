// Test locally with Docker:
// sam build; sam local invoke --event events/event.json WelcomeMsgFunction --profile AdministratorAccess-635874589224
//
import fortune from "fortune-messages";
import { getCorsHeaders, handleOptionsRequest } from "./cors.mjs";

export const lambdaHandler = async (event, context) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === "OPTIONS") {
    return handleOptionsRequest(event);
  }
  const msgMe = fortune();

  const response = {
    statusCode: 200,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({
      message: msgMe,
    }),
  };

  return response;
};
