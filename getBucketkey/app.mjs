// Test locally with Docker
// sam build; sam local invoke --event events/event.json GetAlbumsFunction --profile AdministratorAccess-635874589224

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export const lambdaHandler = async (event) => {
  const origin = null;
  // setup AWS
  const client = new S3Client({ region: "us-west-2" });

  const command = new GetObjectCommand({
    Bucket: "skicyclerun.lib",
    Key: "POTUS_01.txt",
  });

  try {
    const response = await client.send(command);
    // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
    // https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_GetObject_section.html
    // const bodyMsg = await response.Body.toString();
    const bodyStr = await response.Body.transformToString(); // read content of file/key

    const contentBody = {
      Content: bodyStr,
    };
    const rNum = uuidv4();
    const resJSON = {
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        ...CORS_HEADERS,
        function: "getBucketKey",
        cypher: rNum,
        etag: response.ETag,
      },
      body: JSON.stringify(contentBody),
    };
    return resJSON;
  } catch (err) {
    console.log(`Error in code: getBucketKey Function:`);
    console.error(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: err.message,
      }),
    };
  }
};
