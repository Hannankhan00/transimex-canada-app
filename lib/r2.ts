import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 Configuration Helper
 * Supports both CLOUDFLARE_R2_* and R2_* environment variable formats.
 */
function getR2Env() {
  const accountId =
    process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim() ||
    process.env.R2_ACCOUNT_ID?.trim() ||
    "";
  const accessKeyId =
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() ||
    process.env.R2_ACCESS_KEY_ID?.trim() ||
    "";
  const secretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() ||
    process.env.R2_SECRET_ACCESS_KEY?.trim() ||
    "";
  const bucketName =
    process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim() ||
    process.env.R2_BUCKET_NAME?.trim() ||
    "transimex-vault";
  const publicUrl =
    process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim() ||
    process.env.R2_PUBLIC_URL?.trim() ||
    "";

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

/**
 * Checks if Cloudflare R2 environment credentials have been supplied.
 */
export function isR2Configured(): boolean {
  const { accountId, accessKeyId, secretAccessKey } = getR2Env();
  return Boolean(accountId && accessKeyId && secretAccessKey);
}

// Singleton S3 client instance for connection reuse
let cachedClient: S3Client | null = null;

/**
 * Returns a configured S3Client targeted at Cloudflare R2 endpoint.
 */
export function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  const { accountId, accessKeyId, secretAccessKey } = getR2Env();

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedClient;
}

export interface UploadR2Params {
  key: string;
  buffer: Buffer | Uint8Array;
  mimeType?: string;
  metadata?: Record<string, string>;
}

export interface UploadR2Result {
  key: string;
  url?: string;
  bucket: string;
  size: number;
}

/**
 * Uploads a file buffer directly to Cloudflare R2.
 */
export async function uploadToR2({
  key,
  buffer,
  mimeType = "application/octet-stream",
  metadata = {},
}: UploadR2Params): Promise<UploadR2Result> {
  const client = getR2Client();
  const { bucketName, publicUrl } = getR2Env();

  if (!client) {
    throw new Error(
      "Cloudflare R2 is not configured. Please supply CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY in .env.local"
    );
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: metadata,
  });

  await client.send(command);

  const fileUrl = publicUrl
    ? `${publicUrl.replace(/\/$/, "")}/${encodeURIComponent(key)}`
    : undefined;

  return {
    key,
    url: fileUrl,
    bucket: bucketName,
    size: buffer.length,
  };
}

/**
 * Downloads a file buffer from Cloudflare R2.
 */
export async function getFromR2(key: string): Promise<{
  buffer: Buffer;
  contentType: string;
  contentLength: number;
} | null> {
  const client = getR2Client();
  const { bucketName } = getR2Env();

  if (!client) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      return null;
    }

    // Convert stream to Buffer
    const byteArray = await response.Body.transformToByteArray();
    const buffer = Buffer.from(byteArray);

    return {
      buffer,
      contentType: response.ContentType || "application/octet-stream",
      contentLength: response.ContentLength || buffer.length,
    };
  } catch (err: any) {
    console.error(`[Cloudflare R2] Failed to get object ${key}:`, err.message);
    return null;
  }
}

/**
 * Generates a pre-signed temporary download URL for a file in Cloudflare R2.
 */
export async function getR2PresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const client = getR2Client();
  const { bucketName } = getR2Env();

  if (!client) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch (err: any) {
    console.error(`[Cloudflare R2] Failed to generate presigned URL for ${key}:`, err.message);
    return null;
  }
}

/**
 * Deletes an object from Cloudflare R2.
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const client = getR2Client();
  const { bucketName } = getR2Env();

  if (!client) {
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (err: any) {
    console.error(`[Cloudflare R2] Failed to delete object ${key}:`, err.message);
    return false;
  }
}
