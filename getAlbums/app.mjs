// Test locally with Docker
// sam build; sam local invoke --event events/event.json GetAlbumsFunction --profile AdministratorAccess-635874589224
// Deploy to AWS:
// sam deploy  --profile AdministratorAccess-635874589224

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getParams } from './params.mjs';

export const lambdaHandler = async (event, context) => {

  // setup AWS
  const s3 = new S3Client({ region: "us-west-2" });

  //get bucketName from JSON
  let [bucketName, albumRepo] = getParams(event, 'skicyclerun.lib', 'albums');

  console.log("double check stuff: ", bucketName, " ", albumRepo)
  const params = {
    Bucket: bucketName,
    Prefix: albumRepo,
    Delimiter: '/'
  };

  // Create the ListObjectsV2 command
  const listObjectsCommand = new ListObjectsV2Command(params);

  // List objects in the subfolder
  try {
    const response = await s3.send(listObjectsCommand);
    // console.log("[DEBUG]: response: \n", response)
    const albumPrefix = response.CommonPrefixes;
    const albumPaths = albumPrefix.map(obj => obj.Prefix);
    const albumObject = albumPaths.reduce((acc, path, index) => {
      acc[`album${index + 1}`] = path;
      return acc;
    }, {})
    // console.log("[DEBUG] albumObject:", albumObject)

    // const resBody = {
    //   "albums": albumObject
    // }
    const resJSON = {
      "isBase64Encoded": false,
      "statusCode": 200,
      "headers": {
        "function": "getAlbums",
        "Content-Type": "application/json"
      },
    };

    resJSON.body = JSON.stringify(albumObject);

    // console.log("[DEBUG]: \n", resJSON)
    return resJSON

  } catch (error) {
    console.error("[ERROR] getAlbums API: Error listing objects:", error);
  }

};
