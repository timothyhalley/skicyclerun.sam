// Test locally with Docker:
// 1) sam build;
// 2) sam local invoke --event events/event.json EchoEchoFunction
// Test globally:
// # Test with name parameter
// curl "https://api.skicyclerun.com/dev/echoecho?name=Alice"

// # Test with greeter parameter
// curl "https://api.skicyclerun.com/dev/echoecho?greeter=WorldTraveler"

// # Test with no parameters (should default to NoNotMe)
// curl "https://api.skicyclerun.com/dev/echoecho"
//
import { greet } from "./greet.mjs";
import { getCorsHeaders, handleOptionsRequest } from "./cors.mjs";

export const lambdaHandler = async (event, context) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === "OPTIONS") {
    return handleOptionsRequest(event);
  }
  // Get params from API call
  // https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html?icmpid=apigateway_console#api-gateway-simple-proxy-for-lambda-input-format
  const queryParams = event.queryStringParameters || {};

  var res = {
    statusCode: 200,
    headers: getCorsHeaders(origin),
  };

  // Get the 'name' or 'greeter' query parameter, default to 'NoNotMe' if not provided
  const nameParam = queryParams.name || queryParams.greeter || "NoNotMe";

  var greeter = greet(event, nameParam);
  console.log("DEBUG: Greeter: ", greeter);
  console.log("DEBUG: Query Params: ", queryParams);

  res.body = JSON.stringify({
    message: `Hello, ${greeter}!`,
    queryParams: queryParams,
    providedName: nameParam,
  });

  return res;
};
