// Test locally with Docker:
// sam build; clear; sam local invoke --event events/event.json GetAlbumPhotosFunction --profile AdministratorAccess-635874589224
// Deploy to AWS:
// sam deploy  --profile AdministratorAccess-635874589224

// https://api.skicyclerun.com/getphotos?bucketName=skicyclerun.lib&albumPath=albums/tokyo/

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getParams } from "./params.mjs";
import { getCorsHeaders, handleOptionsRequest } from "./cors.mjs";

export const lambdaHandler = async (event, context) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === "OPTIONS") {
    return handleOptionsRequest(event);
  }
  // setup AWS
  const client = new S3Client({ region: "us-west-2" });

  //get bucketName from JSON
  let [bucketName, albumPath] = getParams(
    event,
    "skicyclerun.lib",
    "albums/default"
  );

  console.log("[DEBUG] - bucket and folder: ", bucketName, albumPath);

  // Create the ListObjectsV2 command
  const input = {
    Bucket: bucketName, // required
    Prefix: albumPath,
    Delimiter: "/",
    EncodingType: "url",
  };
  const command = new ListObjectsV2Command(input);

  // List objects in the subfolder
  try {
    const response = await client.send(command);

    // Handle case where folder is empty
    if (!response.Contents || response.Contents.length === 0) {
      console.log("[INFO] No objects found in prefix:", albumPath);
      return {
        statusCode: 200,
        headers: {
          ...getCorsHeaders(origin),
          bucket: bucketName,
          album: albumPath,
        },
        body: JSON.stringify([]), // Return a 200 OK with an empty array
      };
    }

    const keys = response.Contents.map((object) => object.Key);
    const photoAPI = {};
    const ifPhoto = new RegExp(/\.(jpe?g|gif|png|svg)$/i);
    for (const key in keys) {
      let apiKeyItem = keys[key];
      if (ifPhoto.test(apiKeyItem)) {
        photoAPI[key] = apiKeyItem;
      }
    }

    const httpSC = response.$metadata.httpStatusCode;
    const resJSON = {
      isBase64Encoded: false,
      statusCode: httpSC,
      headers: {
        ...getCorsHeaders(origin),
        function: "getPhotos",
        bucket: bucketName,
        album: albumPath,
      },
    };

    resJSON.body = JSON.stringify(photoAPI);

    return resJSON;
  } catch (error) {
    console.error("[ERROR] getPhoto API: Error listing objects:\n", error);
    // ALWAYS return a valid error response for API Gateway
    return {
      isBase64Encoded: false,
      statusCode: 500,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
      }),
    };
  }
};
