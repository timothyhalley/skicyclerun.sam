export function getParams(event, bucket, albums) {

    if (event.bucket && event.bucket !== "") {
        bucket = event.bucket;
    } else if (event.queryStringParameters && event.queryStringParameters.bucket && event.queryStringParameters.bucket !== "") {
        bucket = event.queryStringParameters.bucket;
    }

    if (event.albums && event.albums !== "") {
        albums = event.albums;
    } else if (event.queryStringParameters && event.queryStringParameters.albums && event.queryStringParameters.albums !== "") {
        albums = event.queryStringParameters.albums;
    }

    // Shape prefex with proper ending slash:
    const ifSlash = new RegExp(/\/$/)
    if (!(ifSlash.test(albums))) {
        albums = albums + "/"
    }

    return [bucket, albums];
}