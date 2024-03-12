// Test locally with Docker:
// sam build; sam local invoke --event events/event.json EchoEchoFunction --profile AdministratorAccess-635874589224
//
import { greet } from './greet.mjs';

export const lambdaHandler = async (event, context) => {

  // Get params from API call
  // https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html?icmpid=apigateway_console#api-gateway-simple-proxy-for-lambda-input-format
  const queryParams = event.queryStringParameters;

  var res = {
    "statusCode": 200,
    "headers": {
      "Content-Type": "*/*"
    }
  };

  var greeter = greet(event, 'NoNotMe');
  console.log("DEBUG: Greeter: ", greeter)

  res.body = "Hello, " + greeter + "!";

  return res;
};

