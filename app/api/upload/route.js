import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
    try {
        const body = await request.json();
        const { links, userId } = body;

        if (!links) {
            return NextResponse.json({ error: 'No links provided' }, { status: 400 });
        }

        const host = request.headers.get('host') || 'my-video-proxy-three.vercel.app';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = `${protocol}://${host}`;

        const linkArray = typeof links === 'string' 
            ? links.split('\n').map(l => l.trim()).filter(l => l.length > 0)
            : links;

        const processedFiles = [];

        for (const fileUrl of linkArray) {
            const fileId = Math.random().toString(36).substring(2, 10);
            
            let cleanTitle = `Media_File_${fileId}.mp4`;
            let directDownloadUrl = fileUrl;

            const driveMatch = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
            if (driveMatch && driveMatch[1]) {
                const gId = driveMatch[1];
                directDownloadUrl = `https://drive.google.com/uc?export=download&id=${gId}`;
                cleanTitle = `GDrive_Media_${gId.substring(0, 6)}.mp4`;
            }

            const fileRecord = {
                id: fileId,
                name: cleanTitle,
                size: '750.00 MB',
                quality: '1080p WEB-DL',
                date: new Date().toISOString().split('T')[0],
                status: 'Processing',
                url: `${baseUrl}/file/${fileId}`,
                embed_url: `${baseUrl}/embed/${fileId}`,
                original_url: directDownloadUrl,
                user_id: userId || null
            };

            const { error: dbError } = await supabase
                .from('files')
                .insert([fileRecord]);

            if (!dbError) {
                processedFiles.push(fileRecord);
            } else {
                console.error('Supabase Insert Error:', dbError);
            }
        }

        return NextResponse.json({ 
            success: true, 
            count: processedFiles.length, 
            files: processedFiles 
        });

    } catch (err) {
        console.error('Server Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}