import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

const bucket = env.S3_BUCKET;

/** Builds a storage key that keeps one user's files together. */
export function buildStorageKey(userId: string, kind: "photo" | "audio" | "render", ext: string) {
  const id = crypto.randomUUID();
  return `${kind}s/${userId}/${id}.${ext.replace(/^\./, "")}`;
}

/** URL the browser can PUT a file to directly, valid for 10 minutes. */
export async function presignUpload(key: string, contentType: string) {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(s3, cmd, { expiresIn: 600 });
}

/** URL the browser can read a private file from, valid for one hour. */
export async function presignDownload(key: string) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: 3600 });
}

/** Size and type of an uploaded file, or null when it is not there. */
export async function headObject(key: string) {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType ?? "" };
  } catch {
    return null;
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
