# API Testing Guide

This guide helps you validate, build, and test all Lambda functions locally for the SAM application defined in `template.yaml`. It uses defaults from `samconfig.toml` (lint enabled for validate, cached/parallel build, stack name `skicyclerunAPI-v2`).

Requirements

- Docker Desktop running (for `sam local`)
- AWS credentials configured (for S3/DynamoDB access when functions hit AWS services)
- macOS zsh shell (commands below are zsh-compatible)

Global workflow

1. Validate template
2. Build once for all functions
3. Invoke a function locally with an example event (or run `sam local start-api` and curl a route)

Optional local API server

- You can start the local API for all routes: `sam local start-api`
- Then call endpoints at [http://127.0.0.1:3000](http://127.0.0.1:3000) using the paths listed below

---

## Common steps

Validate and build (once)

```zsh
# Validate (uses lint=true from samconfig.toml)
sam validate

# Build (uses cached=true, parallel=true from samconfig.toml)
sam build
```

Notes

- For local invokes that require query string parameters, include them in the event JSON under `queryStringParameters`.
- For protected endpoints (Cognito-authorized), supply `requestContext.authorizer.claims` in the event JSON.

## Quick start: local testing

Two ways to test locally:

- Per-function invoke (fast, precise): run a single Lambda with a specific event from the `events/` folder. Recommended for protected endpoints where you must inject claims.
- Local API gateway: run all routes with `sam local start-api` and call them with curl. Great for public endpoints; note that Cognito claims are not injected by the local gateway.

Setup once per session:

```zsh
sam validate
sam build
```

Invoke individual functions with event files:

```zsh
sam local invoke EchoEchoFunction --event events/EchoEcho.json
sam local invoke RandomFunction --event events/RandomNumber.json
sam local invoke GetAlbumsFunction --event events/getAlbums.json
sam local invoke ProfileFunction --event events/Profile.json  # includes authorizer.claims + matching email
```

Start the local API and curl public routes:

```zsh
sam local start-api
# In another terminal
curl "http://127.0.0.1:3000/echoecho?name=Alice"
curl "http://127.0.0.1:3000/random"
curl "http://127.0.0.1:3000/getalbums?bucket=skicyclerun.lib&albums=albums/"
# Note: /profile requires claims; local gateway does not inject them. Use sam local invoke with events/Profile.json.
```

Unit tests (Mocha/Chai) per function:

```zsh
cd EchoEcho && npm install && npm test
cd ../RandomNumber && npm install && npm test
# repeat per function folder as needed
```

### Call deployed API (with Cognito)

When calling the deployed API, protected routes require a valid Cognito JWT in the Authorization header. Also, for `Profile`, your handler checks that the `email` in the query string matches the token's `email` claim.

zsh quoting tip (avoid globbing on `?`):

```zsh
curl 'https://api.skicyclerun.com/dev/profile?email=skicyclerun@gmail.com'
```

Add your Cognito ID token:

```zsh
# ID token must be for the signed-in user and include an email claim
export ID_TOKEN='<paste-your-cognito-id-token>'
curl -H "Authorization: Bearer $ID_TOKEN" \
  'https://api.skicyclerun.com/dev/profile?email=skicyclerun@gmail.com'
```

Notes

- If you receive `{ "message": "Unauthorized" }`, API Gateway/Cognito rejected the request (missing or invalid token).
- If you receive a 401 from your Lambda response with "Unauthorized or mismatched email", ensure the query email equals the token's `email` claim.
- You can decode the token (e.g., jwt.io) to verify `email`, `aud`, and expiration are correct for this API and user.

---

## EchoEchoFunction

- Path/Method: GET /echoecho
- Purpose: Echo-style greeting using `name` or `greeter` query param.
- Query params: `name` or `greeter` (optional; defaults to "NoNotMe")
- Function ID: EchoEchoFunction

Steps

1. sam validate
2. sam build
3. Prepare event and sam local invoke (below)

Local invoke example

```zsh
sam local invoke EchoEchoFunction --event events/EchoEcho.json
```

Local API and curl

```zsh
sam local start-api
# In another terminal
curl "http://127.0.0.1:3000/echoecho?name=Alice"
```

Unit test (AWS-recommended)

Create or update EchoEcho/tests/unit/test-handler.mjs as follows:

```javascript
"use strict";
import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = {
  requestContext: { http: { method: "GET" } },
  queryStringParameters: { name: "Alice" },
};
const context = {};
describe("EchoEchoFunction", function () {
  it("returns a greeting for name", async () => {
    const result = await lambdaHandler(event, context);
    expect(result).to.be.an("object");
    expect(result.statusCode).to.equal(200);
    expect(result.body).to.be.a("string");
    let response = JSON.parse(result.body);
    expect(response).to.be.an("object");
    expect(response.message).to.include("Hello, Alice");
  });
});
```

Run the test:

```zsh
cd EchoEcho
npm install # if not already done
npm test
```

---

## WelcomeMsgFunction

- Path/Method: GET /welcome
- Purpose: Returns a random fortune-style message.
- Query params: none
- Function ID: WelcomeMsgFunction

Steps

1. sam validate
2. sam build
3. Prepare event and sam local invoke (below)

Local invoke example

```zsh
sam local invoke WelcomeMsgFunction --event events/WelcomeMsg.json
```

Local API and curl

```zsh
curl "http://127.0.0.1:3000/welcome"
```

Unit test

Create or update WelcomeMsg/tests/unit/test-handler.mjs:

```javascript
"use strict";
import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = { requestContext: { http: { method: "GET" } } };
const context = {};
describe("WelcomeMsgFunction", function () {
  it("returns a random message", async () => {
    const result = await lambdaHandler(event, context);
    expect(result.statusCode).to.equal(200);
    let response = JSON.parse(result.body);
    expect(response.message).to.be.a("string").and.not.empty;
  });
});
```

---

## RandomFunction

- Path/Method: GET /random
- Purpose: Returns a UUID.
- Query params: none
- Function ID: RandomFunction

Steps

1. sam validate
2. sam build
3. Prepare event and sam local invoke (below)

Local invoke example

```zsh
sam local invoke RandomFunction --event events/RandomNumber.json
```

Local API and curl

```zsh
curl "http://127.0.0.1:3000/random"
```

Unit test

Create or update RandomFunction/tests/unit/test-handler.mjs:

```javascript
"use strict";
import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = { requestContext: { http: { method: "GET" } } };
const context = {};
describe("RandomFunction", function () {
  it("returns a UUID", async () => {
    const result = await lambdaHandler(event, context);
    expect(result.statusCode).to.equal(200);
    let response = JSON.parse(result.body);
    expect(response.message).to.match(/[0-9a-fA-F-]{36}/);
  });
});
```

---

## GetBucketKeyFunction

- Path/Method: GET /getkey
- Purpose: Fetches a specific S3 object and returns its content.
- Query params: none (key and bucket are hardcoded in handler for testing)
- Function ID: GetBucketKeyFunction
- AWS access: Requires access to S3 bucket specified by `ProtectedContentBucket` parameter (from samconfig overrides) and the bucket used in code.

Steps

1. sam validate
2. sam build
3. Prepare event and sam local invoke (below)

Local invoke example

```zsh
sam local invoke GetBucketKeyFunction --event events/getBucketkey.json
```

Local API and curl

```zsh
curl "http://127.0.0.1:3000/getkey"
```

---

## GetAlbumsFunction

- Path/Method: GET /getalbums
- Purpose: Lists album prefixes from S3 under a root folder.
- Query params: bucket (default: skicyclerun.lib), albums (default: albums/)
- Function ID: GetAlbumsFunction
- AWS access: Requires S3 List permissions on the configured bucket.

Steps

1. sam validate
2. sam build
3. Prepare event and sam local invoke (below)

Local invoke example

```zsh
sam local invoke GetAlbumsFunction --event events/getAlbums.json
```

Local API and curl

```zsh
curl "http://127.0.0.1:3000/getalbums?bucket=skicyclerun.lib&albums=albums/"
```

Unit test

Create or update getAlbums/tests/unit/test-handler.mjs:

```javascript
"use strict";
import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = {
  requestContext: { http: { method: "GET" } },
  queryStringParameters: { bucket: "skicyclerun.lib", albums: "albums/" },
};
const context = {};
describe("GetAlbumsFunction", function () {
  it("returns album prefixes", async () => {
    const result = await lambdaHandler(event, context);
    expect(result.statusCode).to.equal(200);
    let response = JSON.parse(result.body);
    expect(response).to.be.an("object");
    // Optionally check keys in response
  });
});
```

---

## GetAlbumPhotosFunction

- Path/Method: GET /getphotos
- Purpose: Lists photo keys for an album path.
- Query params: bucketName (default: skicyclerun.lib), albumPath (e.g., albums/tokyo/)
- Function ID: GetAlbumPhotosFunction
- AWS access: Requires S3 List permissions.

Steps

1. sam validate
2. sam build
3. Prepare event and sam local invoke (below)

Local invoke example

```zsh
sam local invoke GetAlbumPhotosFunction --event events/getPhotos.json
```

Local API and curl

```zsh
curl "http://127.0.0.1:3000/getphotos?bucketName=skicyclerun.lib&albumPath=albums/tokyo/"
```

Unit test

Create or update getPhotos/tests/unit/test-handler.mjs:

```javascript
"use strict";
import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = {
  requestContext: { http: { method: "GET" } },
  queryStringParameters: {
    bucketName: "skicyclerun.lib",
    albumPath: "albums/tokyo/",
  },
};
const context = {};
describe("GetAlbumPhotosFunction", function () {
  it("returns photo keys for album", async () => {
    const result = await lambdaHandler(event, context);
    expect(result.statusCode).to.equal(200);
    let response = JSON.parse(result.body);
    expect(response).to.be.an("object");
    // Optionally check photo keys
  });
});
```

---

## GetAlbumPhotosRNDFunction

- Path/Method: GET /getphotosrandom
- Purpose: Returns N random photo URLs from an album.
- Query params: bucketName, albumPath, numPhotos (e.g., 5)
- Function ID: GetAlbumPhotosRNDFunction
- AWS access: Requires S3 List permissions.

Steps

1. sam validate
2. sam build
3. Prepare event and sam local invoke (below)

Local invoke example

```zsh
sam local invoke GetAlbumPhotosRNDFunction --event events/getPhotosRandom.json
```

Local API and curl

```zsh
curl "http://127.0.0.1:3000/getphotosrandom?bucketName=skicyclerun.lib&albumPath=albums/tokyo/&numPhotos=5"
```

Unit test

Create or update getPhotosRandom/tests/unit/test-handler.mjs:

```javascript
"use strict";
import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = {
  requestContext: { http: { method: "GET" } },
  queryStringParameters: {
    bucketName: "skicyclerun.lib",
    albumPath: "albums/tokyo/",
    numPhotos: "5",
  },
};
const context = {};
describe("GetAlbumPhotosRNDFunction", function () {
  it("returns random photo URLs", async () => {
    const result = await lambdaHandler(event, context);
    expect(result.statusCode).to.equal(200);
    let response = JSON.parse(result.body);
    expect(response).to.be.an("array");
    expect(response.length).to.be.at.most(5);
  });
});
```

---

## StatusFunction

- Path/Method: GET /status
- Purpose: Simple health/status response.
- Query params: none
- Function ID: StatusFunction

Steps

1. sam validate
2. sam build
3. Prepare event and sam local invoke (below)

Local invoke example

```zsh
sam local invoke StatusFunction --event events/Status.json
```

Local API and curl

```zsh
curl "http://127.0.0.1:3000/status"
```

Unit test

Create or update Status/tests/unit/test-handler.mjs:

```javascript
"use strict";
import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = { requestContext: { http: { method: "GET" } } };
const context = {};
describe("StatusFunction", function () {
  it("returns ok status", async () => {
    const result = await lambdaHandler(event, context);
    expect(result.statusCode).to.equal(200);
    let response = JSON.parse(result.body);
    expect(response.ok).to.equal(true);
    expect(response.ts).to.be.a("number");
  });
});
```

---

## ProfileFunction (Protected)

- Path/Method: GET /profile (Cognito-authorized)
- Purpose: Returns user profile details derived from JWT claims.
- Query params: email (must match `claims.email`)
- Function ID: ProfileFunction

Steps

1. sam validate
2. sam build
3. Prepare event with claims and sam local invoke (below)

Local invoke example

```zsh
sam local invoke ProfileFunction --event events/Profile.json
```

Local API and curl (authorizer not enforced by local gateway; function still checks claims, so use `--header` is not sufficient for local unless you mock event)

```zsh
# Prefer local invoke with mocked claims as above
```

Unit test

Create or update Profile/tests/unit/test-handler.mjs:

```javascript
"use strict";
import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = {
  requestContext: {
    http: { method: "GET" },
    authorizer: {
      claims: {
        sub: "11111111-2222-3333-4444-555555555555",
        email: "user@example.com",
        "cognito:groups": ["members"],
      },
    },
  },
  queryStringParameters: { email: "user@example.com" },
};
const context = {};
describe("ProfileFunction", function () {
  it("returns user profile", async () => {
    const result = await lambdaHandler(event, context);
    expect(result.statusCode).to.equal(200);
    let response = JSON.parse(result.body);
    expect(response.email).to.equal("user@example.com");
    expect(response.groups).to.include("members");
  });
});
```

---

## ProtectedPostsFunction (Protected)

- Paths/Methods:
  - GET /protected/posts (list)
  - GET /protected/posts/{slug} (detail)
- Purpose: List metadata or fetch protected post content from S3 with metadata in DynamoDB.
- Query params: none (for list); path parameter `slug` (for detail)
- Function ID: ProtectedPostsFunction
- AWS access: Requires DynamoDB read and S3 read on protected bucket.

Steps

1. sam validate
2. sam build
3. Prepare list/detail event with claims and sam local invoke (below)

Local invoke example

```zsh
sam local invoke ProtectedPostsFunction --event events/ProtectedPosts.json
```

Local API and curl (note: local gateway doesn’t enforce Cognito; function still requires claims, so prefer local invoke with mocked claims)

```zsh
# List
curl "http://127.0.0.1:3000/protected/posts"
# Detail
curl "http://127.0.0.1:3000/protected/posts/my-post"
```

Unit test

Create or update ProtectedPosts/tests/unit/test-handler.mjs:

```javascript
"use strict";
import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = {
  requestContext: {
    http: { method: "GET" },
    authorizer: {
      claims: {
        sub: "11111111-2222-3333-4444-555555555555",
        email: "user@example.com",
        "cognito:groups": ["members"],
      },
    },
  },
};
const context = {};
describe("ProtectedPostsFunction", function () {
  it("returns posts list for user", async () => {
    const result = await lambdaHandler(event, context);
    expect(result.statusCode).to.equal(200);
    let response = JSON.parse(result.body);
    expect(response).to.be.an("array");
    // Optionally check post objects
  });
});
```

---

## Start all routes locally (optional)

```zsh
# Starts the local API on http://127.0.0.1:3000
sam local start-api
```

## Troubleshooting tips

- Docker must be running for `sam local`.
- For S3/DynamoDB calls, ensure your AWS credentials have access to:
  - Bucket: `ProtectedContentBucket` (samconfig.toml overrides it to `skicyclerun.lib`)
  - DynamoDB table provisioned by the stack for protected posts
- If a function expects `queryStringParameters`, include them in the event JSON. If it expects `pathParameters` (e.g., `{ slug }`), include that object.
- CORS headers are set by functions; they don’t impact local invocation but will appear in responses.

---

Generated based on:

- `template.yaml` functions and API routes
- `samconfig.toml` defaults and parameter overrides
