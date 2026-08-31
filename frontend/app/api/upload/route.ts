import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type AllowedUpload = {
  directory: 'pdfs' | 'audio' | 'videos';
  extension: string;
  contentType: string;
};

const ALLOWED_UPLOADS: Record<string, AllowedUpload> = {
  'application/pdf': {
    directory: 'pdfs',
    extension: 'pdf',
    contentType: 'application/pdf',
  },
  'audio/mpeg': { directory: 'audio', extension: 'mp3', contentType: 'audio/mpeg' },
  'audio/mp3': { directory: 'audio', extension: 'mp3', contentType: 'audio/mpeg' },
  'audio/wav': { directory: 'audio', extension: 'wav', contentType: 'audio/wav' },
  'audio/x-wav': { directory: 'audio', extension: 'wav', contentType: 'audio/wav' },
  'audio/ogg': { directory: 'audio', extension: 'ogg', contentType: 'audio/ogg' },
  'audio/mp4': { directory: 'audio', extension: 'm4a', contentType: 'audio/mp4' },
  'audio/x-m4a': { directory: 'audio', extension: 'm4a', contentType: 'audio/mp4' },
  'audio/aac': { directory: 'audio', extension: 'aac', contentType: 'audio/aac' },
  'video/mp4': { directory: 'videos', extension: 'mp4', contentType: 'video/mp4' },
  'video/webm': { directory: 'videos', extension: 'webm', contentType: 'video/webm' },
  'video/quicktime': { directory: 'videos', extension: 'mov', contentType: 'video/quicktime' },
};

const safeOwnerSegment = (userId: string) => userId.replace(/[^A-Za-z0-9_-]/g, '_');

export async function POST(request: Request) {
  try {
    const authorization = await requireRole(['admin', 'teacher']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid upload form' }, { status: 400 });
    }

    const fileEntry = formData.get('file');
    if (!fileEntry || typeof fileEntry === 'string') {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    const file = fileEntry;
    if (!file.size) {
      return NextResponse.json({ error: 'The uploaded file is empty' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Files must be 50 MB or smaller' },
        { status: 413 },
      );
    }

    const uploadType = ALLOWED_UPLOADS[file.type.toLowerCase()];
    if (!uploadType) {
      return NextResponse.json(
        { error: 'Only PDF, audio, and video files are supported' },
        { status: 415 },
      );
    }

    // Do not use the caller-provided filePath. The old route accepted a path
    // from the browser and upserted it, allowing an attacker to replace a
    // known object. Every object now receives a server-generated path and
    // upload is deliberately non-upserting.
    const storagePath = [
      'uploads',
      safeOwnerSegment(authorization.actor.userId),
      uploadType.directory,
      `${randomUUID()}.${uploadType.extension}`,
    ].join('/');

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage
      .from('resources')
      .upload(storagePath, fileBuffer, {
        contentType: uploadType.contentType,
        upsert: false,
      });

    if (error) {
      console.error('Resource upload failed:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('resources')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      publicUrl: publicUrlData.publicUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
