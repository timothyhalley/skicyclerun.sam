// Test locally with Docker:
// sam build; sam local invoke --event events/event.json WelcomeMsgFunction --profile AdministratorAccess-635874589224
//
import fortune from 'fortune-messages';

export const lambdaHandler = async (event, context) => {

  const msgMe = fortune();

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: msgMe
    })
  };

  return response;
};
