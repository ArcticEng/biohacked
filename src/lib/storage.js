// ═══════════════════════════════════════════════════
// Storage — Supabase Storage + local-FS fallback for dev
//
// In prod (STORAGE_PROVIDER=supabase): uploads go to Supabase Storage bucket
// In dev (STORAGE_PROVIDER=local, default): writes to /public/uploads
// ═══════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const PROVIDER = process.env.STORAGE_PROVIDER || "local";
const BUCKET = process.env.SUPABASE_BUCKET || "uploads";

// Lazy singleton — Supabase client is only constructed if needed
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

/**
 * Upload a file. Returns a public URL.
 * @param {object} opts
 * @param {Buffer} opts.bytes - File bytes
 * @param {string} opts.filename - Full filename (with extension)
 * @param {string} opts.contentType - MIME type
 * @param {string} opts.prefix - Path prefix e.g. "checkins/<userId>"
 */
export async function uploadFile({ bytes, filename, contentType, prefix = "" }) {
  const finalPath = prefix ? `${prefix}/${filename}` : filename;

  if (PROVIDER === "supabase") {
    const supabase = getSupabase();
    const { error } = await supabase.storage.from(BUCKET).upload(finalPath, bytes, {
      contentType,
      upsert: false,
    });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(finalPath);
    return data.publicUrl;
  }

  // ── LOCAL DEV FALLBACK ──
  const uploadDir = path.join(process.cwd(), "public", "uploads", prefix);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", finalPath), bytes);
  return `/uploads/${finalPath}`;
}

/**
 * Generate a unique filename with hash + extension preserved.
 */
export function uniqueFilename(originalName, userId) {
  const ext = (originalName?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  return `${userId}-${randomUUID()}.${ext}`;
}
