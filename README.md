# skicyclerunAPI

## Quick Commands

**Prerequisites:**

- Docker Desktop running (for `sam local`)
- AWS profile configured: `skicyclerun_prd`
- Node.js 20+ installed

**Validate template:**

```bash
sam validate
```

**Build once for all functions:**

```bash
sam build
```

**Local testing (see testAPI.md for full details):**

```bash
# Invoke a single function with event file
sam local invoke EchoEchoFunction --event events/EchoEcho.json

# Test the primary API: GetAlbumPhotosRNDFunction (random photos)
sam local invoke GetAlbumPhotosRNDFunction --event events/getPhotosRandom.json

# Start local API gateway for all routes
sam local start-api
# Then in another terminal:
curl "http://127.0.0.1:3000/echoecho?name=Alice"
curl "http://127.0.0.1:3000/getphotosrandom?bucket=skicyclerun.lib&album=albums/album1/&random=true"
```

**Deploy to AWS:**

```bash
sam build
sam deploy --profile skicyclerun_prd
```

**Invalidate CloudFront cache:**

```bash
aws cloudfront create-invalidation \
  --distribution-id E1GQ61X0LT69AR \
  --paths "/*" \
  --profile skicyclerun_prd

# Check invalidation status
aws cloudfront get-invalidation \
  --id <INVALIDATION_ID> \
  --distribution-id E1GQ61X0LT69AR \
  --profile skicyclerun_prd
```

**Testing documentation:**

- See `testAPI.md` for comprehensive local and unit testing instructions for all functions.

---

## Project Overview

This project contains source code and supporting files for a serverless application that you can deploy with the SAM CLI. It includes the following files and folders.

- welcome - Code for the application's Lambda function.
- events - Invocation events that you can use to invoke the function.
- welcome/tests - Unit tests for the application code.
- template.yaml - A template that defines the application's AWS resources.

The application uses several AWS resources, including Lambda functions and an API Gateway API. These resources are defined in the `template.yaml` file in this project. You can update the template to add AWS resources through the same deployment process that updates your application code.

If you prefer to use an integrated development environment (IDE) to build and test your application, you can use the AWS Toolkit.  
The AWS Toolkit is an open source plug-in for popular IDEs that uses the SAM CLI to build and deploy serverless applications on AWS. The AWS Toolkit also adds a simplified step-through debugging experience for Lambda function code. See the following links to get started.

- [CLion](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [GoLand](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [IntelliJ](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [WebStorm](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [Rider](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [PhpStorm](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [PyCharm](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [RubyMine](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [DataGrip](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [VS Code](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/welcome.html)
- [Visual Studio](https://docs.aws.amazon.com/toolkit-for-visual-studio/latest/user-guide/welcome.html)

## Deploy the Application

The Serverless Application Model Command Line Interface (SAM CLI) is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda.

**Requirements:**

- SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- Node.js 20+ - [Install Node.js](https://nodejs.org/en/), including the NPM package management tool
- Docker Desktop - [Install Docker](https://hub.docker.com/search/?type=edition&offering=community)
- AWS profile configured: `skicyclerun_prd`

**First-time deployment:**

```bash
sam build
sam deploy --guided --profile skicyclerun_prd
```

**Subsequent deployments:**

```bash
sam build
sam deploy --profile skicyclerun_prd
```

Deployment settings are saved in `samconfig.toml` (stack name: `skicyclerunAPI-v2`, region: `us-west-2`).

## API endpoints (clean and small)

Public:

- GET /welcome — simple JSON to test connectivity.
- GET /status — health endpoint.

Authenticated (Cognito User Pool Authorizer, Authorization: Bearer <ID token>):

- GET /profile — returns { sub, email, groups } from token claims.
- GET /protected/posts — returns metadata list user can access (filtered by groups).
- GET /protected/posts/{slug} — returns protected content if authorized.

Storage:

- S3 bucket stores protected content bodies (Markdown/HTML), keyed by slug.
- DynamoDB table ProtectedPosts with items: { slug (PK), title, summary, requiredGroups (string set/array), s3Key }.

CORS:

- Allowed origins: https://skicyclerun.com and http://localhost:4321
- Allow headers: Authorization, Content-Type
- Methods: GET (OPTIONS preflight returns 200 by API Gateway)

Deployment:

- sam build && sam deploy --guided
- Parameters prompted: UserPoolArn, AllowedOrigins, ProtectedContentBucket
- Output: PublicApiBaseUrl (set as PUBLIC_API_BASE_URL in frontend)

- **Stack Name**: The name of the stack to deploy to CloudFormation. This should be unique to your account and region, and a good starting point would be something matching your project name.
- **AWS Region**: The AWS region you want to deploy your app to.
- **Confirm changes before deploy**: If set to yes, any change sets will be shown to you before execution for manual review. If set to no, the AWS SAM CLI will automatically deploy application changes.
- **Allow SAM CLI IAM role creation**: Many AWS SAM templates, including this example, create AWS IAM roles required for the AWS Lambda function(s) included to access AWS services. By default, these are scoped down to minimum required permissions. To deploy an AWS CloudFormation stack which creates or modifies IAM roles, the `CAPABILITY_IAM` value for `capabilities` must be provided. If permission isn't provided through this prompt, to deploy this example you must explicitly pass `--capabilities CAPABILITY_IAM` to the `sam deploy` command.
- **Save arguments to samconfig.toml**: If set to yes, your choices will be saved to a configuration file inside the project, so that in the future you can just re-run `sam deploy` without parameters to deploy changes to your application.

You can find your API Gateway Endpoint URL in the output values displayed after deployment.

## Local Testing

**Build your application:**

```bash
sam build
```

The SAM CLI installs dependencies for each function, creates deployment packages, and saves them in `.aws-sam/build/`.

**Test a single function with an event file:**

Event files are in the `events/` folder (one per function). Each event includes the expected API Gateway proxy format with `requestContext`, `queryStringParameters`, etc.

```bash
# Example: test EchoEchoFunction
sam local invoke EchoEchoFunction --event events/EchoEcho.json

# Example: test ProfileFunction (protected, includes authorizer.claims)
sam local invoke ProfileFunction --event events/Profile.json

# Primary API: GetAlbumPhotosRNDFunction (returns random photos from an album)
sam local invoke GetAlbumPhotosRNDFunction --event events/getPhotosRandom.json
```

**Start the local API gateway:**

Run all routes locally on port 3000. Note: protected endpoints (with Cognito authorizers) won't receive claims via curl, so use `sam local invoke` with event files for those.

```bash
sam local start-api
# In another terminal:
curl "http://127.0.0.1:3000/echoecho?name=Alice"
curl "http://127.0.0.1:3000/welcome"
curl "http://127.0.0.1:3000/status"

# Primary API: Get random photos from an album
curl "http://127.0.0.1:3000/getphotosrandom?bucket=skicyclerun.lib&album=albums/album1/&random=true"
```

**Comprehensive testing guide:**

See `testAPI.md` for detailed instructions on:

- Per-function local invoke examples
- Unit tests (Mocha/Chai)
- Protected endpoint testing (Cognito claims)
- Deployed API testing with JWT tokens

## Add a resource to your application

The application template uses AWS Serverless Application Model (AWS SAM) to define application resources. AWS SAM is an extension of AWS CloudFormation with a simpler syntax for configuring common serverless application resources such as functions, triggers, and APIs. For resources not included in [the SAM specification](https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md), you can use standard [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html) resource types.

## Fetch and Tail Lambda Logs

Fetch logs from deployed functions:

```bash
# Tail logs for a specific function
sam logs -n EchoEchoFunction --stack-name skicyclerunAPI-v2 --tail --profile skicyclerun_prd

# Fetch logs for a time range
sam logs -n ProfileFunction --stack-name skicyclerunAPI-v2 --start-time '10min ago' --profile skicyclerun_prd
```

See [SAM CLI logging documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-logging.html) for more options.

## Unit Tests

Each function has unit tests in its `tests/unit/test-handler.mjs` file using [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/).

**Run tests for a function:**

```bash
cd EchoEcho
npm install
npm test
```

**Run tests for all functions:**

```bash
for dir in EchoEcho WelcomeMsg RandomNumber Status getAlbums getPhotos getPhotosRandom; do
  (cd $dir && npm install && npm test)
done
```

See `testAPI.md` for test templates and examples.

## Cleanup

To delete the deployed stack:

```bash
sam delete --stack-name skicyclerunAPI-v2 --profile skicyclerun_prd
```

## Resources

See the [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) for an introduction to SAM specification, the SAM CLI, and serverless application concepts.

Next, you can use AWS Serverless Application Repository to deploy ready to use Apps that go beyond hello samples and learn how authors developed their applications: [AWS Serverless Application Repository main page](https://aws.amazon.com/serverless/serverlessrepo/)

/\*\*

-
- Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
- @param {Object} event - API Gateway Lambda Proxy Input Format
-
- Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
- @param {Object} context
-
- Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- @returns {Object} object - API Gateway Lambda Proxy Output Format
- \*/
