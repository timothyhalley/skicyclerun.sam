// Test locally with Docker:
// sam build; sam local invoke --event events/event.json RandomFunction --profile AdministratorAccess-635874589224
//
import { v4 as uuidv4 } from "uuid";
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export const lambdaHandler = async (event, context) => {
  const origin = null;
  const rNum = uuidv4();
  const response = {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      message: rNum,
    }),
  };

  return response;
};
