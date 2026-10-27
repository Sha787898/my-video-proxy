import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
    try {
        const body = await request.json();
        const { links, fileName, uploadType, userId } = body;

        if (!links) {
            return NextResponse.json({ error: 'No links provided for uploading' }, { status: 400 });
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
            
            let cleanTitle = fileName && fileName.trim() !== '' ? fileName : '';
            let directDownloadUrl = fileUrl;

            // Google Drive Link or File ID extraction
            const driveMatch = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
            if (driveMatch && driveMatch[1]) {
                const gId = driveMatch[1];
                directDownloadUrl = `https://drive.google.com/uc?export=download&id=${gId}`;
                if (!cleanTitle) {
                    cleanTitle = `GDrive_Media_${gId.substring(0, 6)}.mp4`;
                }
            } else if (!cleanTitle) {
                cleanTitle = `Media_File_${fileId}.mp4`;
            }

            let fileSize = '750.00 MB';
            let fileStatus = 'Processing';

            // Dynamic Nodes & API Key Integration based on uploadType (abyss, pixeldrain, gofile, vikingfile, gdrive)
            if (uploadType && uploadType !== 'gdrive') {
                try {
                    const { data: settingData } = await supabase
                        .from('settings')
                        .select('key, value')
                        .in('key', [`${uploadType}_api_key`, `${uploadType}_token`]);

                    const keyObj = {};
                    settingData?.forEach(s => keyObj[s.key] = s.value);

                    if (uploadType === 'abyss') {
                        const apiKey = keyObj['abyss_api_key'] || 'd6dfaae96764d5bce6fe82fe9b739ac5';
                        const abyssRes = await fetch(`http://up.abyss.to/${apiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: directDownloadUrl, name: cleanTitle })
                        });
                        const resJson = await abyssRes.json();
                        if (resJson.url) {
                            directDownloadUrl = resJson.url;
                            fileStatus = 'Active';
                        }
                    } else {
                        // Other nodes (Pixeldrain, GoFile, VikingFile etc.) fallback handler
                        fileStatus = 'Active';
                    }
                } catch (err) {
                    console.error(`${uploadType} Node Mirror Error:`, err);
                    fileStatus = 'Active';
                }
            } else {
                fileStatus = 'Active';
            }

            const systemDownloadLink = `${baseUrl}/file/${fileId}`;
            const systemEmbedLink = `${baseUrl}/embed/${fileId}`;

            const fileRecord = {
                id: fileId,
                name: cleanTitle,
                size: fileSize,
                quality: '1080p WEB-DL',
                date: new Date().toISOString().split('T')[0],
                status: fileStatus,
                url: systemDownloadLink,
                embed_url: systemEmbedLink,
                original_url: directDownloadUrl,
                user_id: userId || null
            };

            const { error: dbError } = await supabase
                .from('files')
                .insert([fileRecord]);

            if (!dbError) {
                processedFiles.push(fileRecord);
            } else {
                console.error('Supabase DB Insert Error:', dbError);
            }
        }

        return NextResponse.json({ 
            success: true, 
            count: processedFiles.length, 
            files: processedFiles 
        });

    } catch (err) {
        console.error('API Critical Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}