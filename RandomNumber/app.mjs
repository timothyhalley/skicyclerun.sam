// Test locally with Docker:
// sam build; sam local invoke --event events/event.json RandomFunction --profile AdministratorAccess-635874589224
//
import { v4 as uuidv4 } from 'uuid';

export const lambdaHandler = async (event, context) => {
  const rNum = uuidv4();
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: rNum,
    })
  };

  return response;
};
