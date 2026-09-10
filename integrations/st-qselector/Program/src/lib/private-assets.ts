import "server-only";

import { queryDatabase } from "@/lib/db";

export interface PrivateAssetMetadata {
  key: string;
  contentType: string;
  accessScope: "question" | "answer" | "attachment";
  contentLength: number;
  sha256: string;
}

export async function getPrivateAssetMetadata(
  candidates: readonly string[],
): Promise<PrivateAssetMetadata | null> {
  if (!candidates.length) return null;
  const result = await queryDatabase<{
    asset_key: string;
    content_type: string;
    access_scope: PrivateAssetMetadata["accessScope"];
    content_length: string;
    content_sha256: string;
  }>(
    `SELECT asset_key, content_type, access_scope, content_length::text, content_sha256
       FROM private_assets
      WHERE asset_key = ANY($1::text[])
      ORDER BY array_position($1::text[], asset_key)
      LIMIT 1`,
    [candidates],
  );
  const row = result.rows[0];
  if (!row) return null;
  const contentLength = Number(row.content_length);
  if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
    throw new Error(`Invalid private asset length metadata: ${row.asset_key}`);
  }
  return {
    key: row.asset_key,
    contentType: row.content_type,
    accessScope: row.access_scope,
    contentLength,
    sha256: row.content_sha256,
  };
}

function hexDigest(bytes: Uint8Array): Promise<string> {
  const value = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return crypto.subtle.digest("SHA-256", value).then((digest) =>
    Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""),
  );
}

export async function getPrivateAssetContent(metadata: PrivateAssetMetadata): Promise<Uint8Array | null> {
  const result = await queryDatabase<{ content: Uint8Array }>(
    `SELECT content
       FROM private_assets
      WHERE asset_key = $1
        AND content_sha256 = $2
        AND content_length = $3`,
    [metadata.key, metadata.sha256, metadata.contentLength],
  );
  const row = result.rows[0];
  if (!row) return null;
  const content = new Uint8Array(row.content);
  if (content.byteLength !== metadata.contentLength || await hexDigest(content) !== metadata.sha256) {
    throw new Error(`Private asset content failed integrity validation: ${metadata.key}`);
  }
  return content;
}
