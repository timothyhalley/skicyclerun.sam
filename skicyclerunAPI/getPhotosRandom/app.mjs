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

    if (response.$metadata.httpStatusCode == 200) {

      if (response.Contents !== undefined) {

        const keys = response.Contents.map((object) => object.Key)
        const ifPhoto = new RegExp(/\.(jpe?g|gif|png|svg)$/i)

        let photo_list = [];

        for (const key in keys) {
          let apiKeyItem = keys[key]
          if (ifPhoto.test(apiKeyItem)) {
            // photoAPI[key] = apiKeyItem
            photo_list.push(apiKeyItem)
          }
        }

        // randomize and slice array down to size
        // const photo_random = getRandomItemsFromArray(photo_list, numPhotos)
        const photo_random = shuffleArray(photo_list)

        // modify array entries to be fully qualified URL/URI
        const prefix = "https://lib.skicyclerun.com/"
        const photos_full = photo_random.map((element) => prefix + element);
        const photos_unique = limitArrayWithUniqueValues(photos_full, numPhotos)

        console.log("[DEBUG] - photos_full: ", photos_full)
        console.log("[DEBUG]------------------\n\n\n------------------")
        console.log("[DEBUG] - photos_unique: ", photos_unique)

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

        resJSON.body = JSON.stringify(photos_unique)

        return resJSON
      } else {
        // empty response likely due to unknown folder or empty folder
        console.log("[WARNING]: No data found in album")
      }

    } else {
      console.log("[ERROR]: failure to reach API]", response.$metadata.httpStatusCode)
      return null
    }

  } catch (error) {
    console.error("[ERROR] getPhotosRandom API:\n", error);
  }

};

function getRandomItemsFromArray(arr, count) {
  const shuffledArray = arr.slice().sort(() => Math.random() - 0.5);
  return shuffledArray.slice(0, count);
}

function shuffleArray(arr) {
  const n = arr.length;
  for (let i = n - 1; i > 0; i--) {
    // Generate a random index between 0 and i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));

    // Swap elements at indices i and j
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function extractNumericalPart(url) {
  // Extract the numerical part from the URL
  const match = url.match(/\d{14}/);
  return match ? parseInt(match[0]) : null;
}

function limitArrayWithUniqueValues(arr, limit) {
  // Ensure the limit is within the array length
  const actualLimit = Math.min(limit, arr.length);

  // Create a map to store unique numerical values
  const uniqueValuesMap = new Map();

  // Iterate through the array
  for (const url of arr) {
    const numericalValue = extractNumericalPart(url);
    if (numericalValue !== null) {
      uniqueValuesMap.set(numericalValue, url);
    } else {
      // Include URLs without numeric values directly
      uniqueValuesMap.set(url, url);
    }
  }

  // Create a new array with the limited elements
  const limitedArray = Array.from(uniqueValuesMap.values()).slice(0, actualLimit);

  return limitedArray;
}