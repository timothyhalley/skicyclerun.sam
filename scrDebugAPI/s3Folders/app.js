import dotenv from "dotenv";
dotenv.config();

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

async function listKeysInSubfolder(bucketName, subfolder) {

    const AWSID = process.env.aws_access_key_id
    const AWSXX = process.env.aws_secret_access_key

    // check if subfolder ends with final slash
    const ifSlash = new RegExp(/\/$/)
    if (!(ifSlash.test(subfolder))) {
        subfolder = subfolder + "/"
    }

    const client = new S3Client({
        region: "us-west-2",
        credentials: {
            accessKeyId: AWSID,
            secretAccessKey: AWSXX,
        },
    });
    const input = { // ListObjectsV2Request
        Bucket: bucketName, // required
        // Delimiter: "STRING_VALUE",
        // EncodingType: "url",
        // MaxKeys: Number("int"),
        Prefix: subfolder,
        // ContinuationToken: "STRING_VALUE",
        // FetchOwner: true || false,
        // StartAfter: "STRING_VALUE",
        // RequestPayer: "requester",
        // ExpectedBucketOwner: "STRING_VALUE",
        // OptionalObjectAttributes: [ // OptionalObjectAttributesList
        //   "RestoreStatus",
        // ],
    };

    const command = new ListObjectsV2Command(input);

    console.log('[DEBUG] Getting folder keys: ', bucketName, ' && ', subfolder)
    try {
        const response = await client.send(command);
        // console.log('[DEBUG] Response: \n', response)
        const keys = response.Contents.map((object) => object.Key);
        return keys;
    } catch (error) {
        console.error("Error listing objects:", error);
        throw error;
    }
}

// Example usage:
const bucketName = 'skicyclerun.lib';
const subfolder = 'albums/indio2023/';

listKeysInSubfolder(bucketName, subfolder)
    .then((keys) => {
        console.log("Keys in subfolder:", keys.length);

        const photoAPI = {};
        const ifPhoto = new RegExp(/\.(jpe?g|gif|png)$/i)
        for (const key in keys) {
            let apiKey = keys[key]
            if (ifPhoto.test(apiKey)) {
                photoAPI[key] = keys[key]
            }
        }

        console.log("API found: \n", photoAPI)
    })
    .catch((err) => {
        console.error("Error:", err);
    });