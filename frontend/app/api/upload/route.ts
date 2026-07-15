import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdminClient();

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filePath = formData.get('filePath') as string;

    if (!file || !filePath) {
      return NextResponse.json({ error: 'Missing file or filePath' }, { status: 400 });
    }

    // Validate file path — prevent path traversal attacks
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.startsWith('\\')) {
      return NextResponse.json(
        { error: 'Invalid file path: directory traversal not allowed' },
        { status: 400 }
      );
    }

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from('resources')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('resources')
      .getPublicUrl(filePath);

    return NextResponse.json({ publicUrl: publicUrlData.publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
