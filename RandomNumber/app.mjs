// Test locally with Docker:
// sam build; sam local invoke --event events/event.json RandomFunction --profile AdministratorAccess-635874589224
//
import { v4 as uuidv4 } from "uuid";
import { getCorsHeaders, handleOptionsRequest } from "./cors.mjs";

export const lambdaHandler = async (event, context) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === "OPTIONS") {
    return handleOptionsRequest(event);
  }
  const rNum = uuidv4();
  const response = {
    statusCode: 200,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({
      message: rNum,
    }),
  };

  return response;
};
