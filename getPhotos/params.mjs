// Note: parameters are case sensitive 
//       and so we have camel and lower case test below:

export function getParams(event, bucketName, albumPath) {

    // console.log("[DEBUG] getParms IN --> albumName: ", albumPath, "\n\n[EVENT] :\n", event)

    if (event.bucketName && event.bucketName !== "") {
        bucketName = event.bucketName;
    } else if (event.queryStringParameters && event.queryStringParameters.bucketName && event.queryStringParameters.bucketName !== "") {
        bucketName = event.queryStringParameters.bucketName;
    } else if (event.queryStringParameters && event.queryStringParameters.bucketname && event.queryStringParameters.bucketname !== "") {
        bucketName = event.queryStringParameters.bucketname;
    } else {
        console.log("[ERROR] BucketName not set by event: ", bucketName)
    }

    if (event.albumPath && event.albumPath !== "") {
        albumPath = event.albumPath;
    } else if (event.queryStringParameters && event.queryStringParameters.albumPath && event.queryStringParameters.albumPath !== "") {
        albumPath = event.queryStringParameters.albumPath;
    } else if (event.queryStringParameters && event.queryStringParameters.albumpath && event.queryStringParameters.albumpath !== "") {
        albumPath = event.queryStringParameters.albumpath;
    } else {
        console.log("[ERROR] AlbumPath not set by event: ", albumPath)
    }

    // Shape with prefex for proper ending slash & encoding : '%2F'
    const ifSlash = new RegExp(/\/$/)
    if (!(ifSlash.test(albumPath))) {
        albumPath = albumPath + "/"
    }
    // albumPath = encodeURIComponent(albumPath);
    // console.log("[DEBUG] getParms OUT --> albumName: ", albumPath)

    return [bucketName, albumPath];
}