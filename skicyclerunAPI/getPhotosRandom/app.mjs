// Test locally with Docker:
// Ensure right credentials are set for profile first: * aws configure sso
// Make sure DOCKER APP (desktop) is running as well
// * sam build; clear; sam local invoke --event events/event.json GetAlbumPhotosRNDFunction --profile AdministratorAccess-635874589224
// Deploy to AWS:
// * sam deploy  --profile AdministratorAccess-635874589224

// https://api.skicyclerun.com/getphotos?bucketName=skicyclerun.lib&albumPath=albums/svgphotos/&numPhotos=6


import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getParams } from './params.mjs';

export const lambdaHandler = async (event, context) => {

  // setup AWS
  const client = new S3Client({ region: "us-west-2" });

  //get bucketName from JSON
  let [bucketName, albumPath, numPhotos] = getParams(event, 'skicyclerun.lib', 'albums/default', 10);

  // console.log("[DEBUG] - bucket and folder: 🪣 ", bucketName, " 💿 ", albumPath, " ☝️ ", numPhotos)

  // Create the ListObjectsV2 command
  const input = {
    Bucket: bucketName, // required
    Prefix: albumPath,
    Delimiter: '/',
    EncodingType: "url"
  };
  const command = new ListObjectsV2Command(input);

  // List objects in the subfolder
  try {
    const response = await client.send(command);
    // console.log("RESPONSE: \n", response)
    const keys = response.Contents.map((object) => object.Key)
    const ifPhoto = new RegExp(/\.(jpe?g|gif|png|svg)$/i)

    let photoAPI = {};
    let photo_list = [];

    for (const key in keys) {
      let apiKeyItem = keys[key]
      if (ifPhoto.test(apiKeyItem)) {
        // photoAPI[key] = apiKeyItem
        photo_list.push(apiKeyItem)
      }
    }

    // randomize and slice array down to size
    const photo_random = getRandomItemsFromArray(photo_list, numPhotos)

    // modify array entries to be fully qualified URL/URI
    const prefix = "https://lib.skicyclerun.com/"
    const photos_full = photo_random.map((element) => prefix + element);
    // console.log("[DEBUG] New photo array: \n", photos_full)

    // return response;
    const httpSC = response.$metadata.httpStatusCode
    const resJSON = {
      "isBase64Encoded": false,
      "statusCode": httpSC,
      "headers": {
        "function": "getPhotos",
        "Content-Type": "application/json",
        "bucket": bucketName,
        "album": albumPath
      },
    };

    // resJSON.body = JSON.stringify(photoAPI)
    resJSON.body = JSON.stringify(photos_full)

    return resJSON

  } catch (error) {
    console.error("[ERROR] getPhoto API: Error listing objects:\n", error);
  }

};

function getRandomItemsFromArray(arr, count) {
  const shuffledArray = arr.slice().sort(() => Math.random() - 0.5);
  return shuffledArray.slice(0, count);
}