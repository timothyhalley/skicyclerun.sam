// Note: parameters are case sensitive
//       and so we have camel and lower case test below:

export function getParams(event, bucketName, albumPath, numPhotos, loraStyle) {
  // console.log("[DEBUG] getParms IN --> numPhotos: ", numPhotos, "\n\n[EVENT] :\n", event)

  // bucketName = always skicyclerun.lib -- likely!
  if (event.bucketName && event.bucketName !== "") {
    bucketName = event.bucketName;
  } else if (
    event.queryStringParameters &&
    event.queryStringParameters.bucketName &&
    event.queryStringParameters.bucketName !== ""
  ) {
    bucketName = event.queryStringParameters.bucketName;
  } else if (
    event.queryStringParameters &&
    event.queryStringParameters.bucketname &&
    event.queryStringParameters.bucketname !== ""
  ) {
    bucketName = event.queryStringParameters.bucketname;
  } else {
    console.log("[ERROR] BucketName not set by event: ", bucketName);
  }

  // Album path
  if (event.albumPath && event.albumPath !== "") {
    albumPath = event.albumPath;
  } else if (
    event.queryStringParameters &&
    event.queryStringParameters.albumPath &&
    event.queryStringParameters.albumPath !== ""
  ) {
    albumPath = event.queryStringParameters.albumPath;
  } else if (
    event.queryStringParameters &&
    event.queryStringParameters.albumpath &&
    event.queryStringParameters.albumpath !== ""
  ) {
    albumPath = event.queryStringParameters.albumpath;
  } else {
    console.log("[ERROR] AlbumPath not set by event: ", albumPath);
  }

  // number of photos
  if (event.numPhotos && event.numPhotos !== "") {
    numPhotos = event.numPhotos;
  } else if (
    event.queryStringParameters &&
    event.queryStringParameters.numPhotos &&
    event.queryStringParameters.numPhotos !== ""
  ) {
    numPhotos = event.queryStringParameters.numPhotos;
  } else if (
    event.queryStringParameters &&
    event.queryStringParameters.numPhotos &&
    event.queryStringParameters.numPhotos !== ""
  ) {
    numPhotos = event.queryStringParameters.numPhotos;
  } else {
    console.log("[ERROR] numPhotos not set by event: ", numPhotos);
  }

  // loraStyle (optional filter)
  if (event.loraStyle && event.loraStyle !== "") {
    loraStyle = event.loraStyle;
  } else if (
    event.queryStringParameters &&
    event.queryStringParameters.loraStyle &&
    event.queryStringParameters.loraStyle !== ""
  ) {
    loraStyle = event.queryStringParameters.loraStyle;
  } else if (
    event.queryStringParameters &&
    event.queryStringParameters.lorastyle &&
    event.queryStringParameters.lorastyle !== ""
  ) {
    loraStyle = event.queryStringParameters.lorastyle;
  }
  // loraStyle remains null/undefined if not provided (no error logged, it's optional)

  // Shape with prefex for proper ending slash & encoding : '%2F'
  const ifSlash = new RegExp(/\/$/);
  if (!ifSlash.test(albumPath)) {
    albumPath = albumPath + "/";
  }
  // albumPath = encodeURIComponent(albumPath);
  // console.log("[DEBUG] getParms OUT --> albumName: ", albumPath)

  return [bucketName, albumPath, numPhotos, loraStyle];
}
