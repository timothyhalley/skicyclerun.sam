import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const toStr = async (body) => {
  if (typeof body === "string") return body;
  if (body instanceof Readable) {
    return await new Promise((resolve, reject) => {
      let data = "";
      body.setEncoding("utf8");
      body.on("data", (chunk) => (data += chunk));
      body.on("end", () => resolve(data));
      body.on("error", reject);
    });
  }
  // SDK v3 returns a Blob-like in some envs
  return body?.transformToString ? body.transformToString() : "";
};

const corsHeaders = (origin) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
});

const groupsFrom = (claims) =>
  Array.isArray(claims?.["cognito:groups"]) ? claims["cognito:groups"] : [];
const allowOrigin = (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",");
  return origin && allowed.includes(origin) ? origin : allowed[0] || "*";
};

const canAccess = (userGroups, requiredGroups) => {
  if (!requiredGroups || requiredGroups.length === 0) return true; // public metadata if empty
  return userGroups.some((g) => requiredGroups.includes(g));
};

export const lambdaHandler = async (event) => {
  const origin = allowOrigin(event);
  const claims = event?.requestContext?.authorizer?.claims;
  if (!claims) {
    return {
      statusCode: 401,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }
  const userGroups = groupsFrom(claims);
  const table = process.env.PROTECTED_POSTS_TABLE;
  const bucket = process.env.PROTECTED_BUCKET;

  const slug = event?.pathParameters?.slug;

  try {
    if (!slug) {
      // list
      const scan = await ddb.send(
        new ScanCommand({
          TableName: table,
          ProjectionExpression: "slug, title, summary, requiredGroups",
        })
      );
      const items = (scan.Items || []).filter((it) =>
        canAccess(userGroups, it.requiredGroups)
      );
      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify(items),
      };
    } else {
      // detail
      const got = await ddb.send(
        new GetCommand({ TableName: table, Key: { slug } })
      );
      if (!got.Item)
        return {
          statusCode: 404,
          headers: corsHeaders(origin),
          body: JSON.stringify({ error: "Not found" }),
        };
      const meta = got.Item;
      if (!canAccess(userGroups, meta.requiredGroups))
        return {
          statusCode: 403,
          headers: corsHeaders(origin),
          body: JSON.stringify({ error: "Forbidden" }),
        };
      const key = meta.s3Key || `${slug}.md`;
      const obj = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      const body = await toStr(obj.Body);
      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify({ slug, title: meta.title, body }),
      };
    }
  } catch (err) {
    console.error("ProtectedPosts error", err);
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: "Internal Error" }),
    };
  }
};
