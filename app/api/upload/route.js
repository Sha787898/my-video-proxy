import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
    try {
        const body = await request.json();
        const { links, userId, uploadType } = body;

        if (!links || typeof links !== 'string' || links.trim() === '') {
            return NextResponse.json({ error: 'No links provided' }, { status: 400 });
        }

        const host = request.headers.get('host') || 'my-video-proxy-three.vercel.app';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = `${protocol}://${host}`;

        const linkArray = links
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && !l.includes('1xxxxxxx') && !l.includes('2xxxxxxx'));

        if (linkArray.length === 0) {
            return NextResponse.json({ error: 'No valid links found in queue' }, { status: 400 });
        }

        const processedFiles = [];

        for (const fileUrl of linkArray) {
            const fileId = Math.random().toString(36).substring(2, 10);
            let cleanTitle = `Media_File_${fileId}.mp4`;
            let fileSize = '750.00 MB';
            let directDownloadUrl = fileUrl;

            // Google Drive ID Extraction & Real Metadata Fetching
            const driveMatch = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
            if (driveMatch && driveMatch[1]) {
                const gId = driveMatch[1];
                directDownloadUrl = `https://drive.google.com/uc?export=download&id=${gId}`;
                cleanTitle = `GDrive_Media_${gId.substring(0, 6)}.mp4`;

                const googleApiKey = process.env.GOOGLE_API_KEY || '';
                if (googleApiKey) {
                    try {
                        const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${gId}?key=${googleApiKey}&fields=name,size,mimeType`);
                        const driveData = await driveRes.json();
                        
                        if (driveData && driveData.name) {
                            cleanTitle = driveData.name;
                        }
                        if (driveData && driveData.size) {
                            const bytes = parseInt(driveData.size, 10);
                            fileSize = bytes > 1024 * 1024 * 1024 
                                ? (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB' 
                                : (bytes / (1024 * 1024)).toFixed(2) + ' MB';
                        }
                    } catch (metaErr) {
                        console.error('Drive Metadata Fetch Warning:', metaErr);
                    }
                }
            }

            let fileStatus = 'Processing';
            const selectedNode = uploadType || 'vidmoly';

            // ইউজারের নিজস্ব user_id অনুযায়ী Supabase সেটিংস থেকে API Key ফেচ করার লজিক
            if (userId) {
                try {
                    const { data: settingData } = await supabase
                        .from('settings')
                        .select('value')
                        .eq('user_id', userId)
                        .eq('key', `${selectedNode}_api_key`)
                        .single();

                    const userApiKey = settingData ? settingData.value : null;

                    if (userApiKey) {
                        if (selectedNode === 'vidmoly') {
                            const vidmolyRes = await fetch(`https://vidmoly.me/api/upload/url?key=${userApiKey}&url=${encodeURIComponent(directDownloadUrl)}`);
                            const vidmolyData = await vidmolyRes.json();
                            
                            if (vidmolyData && vidmolyData.result && vidmolyData.result.filecode) {
                                directDownloadUrl = `https://vidmoly.me/w/${vidmolyData.result.filecode}`;
                                fileStatus = 'Active';
                            }
                        } else if (selectedNode === 'abyss') {
                            const abyssRes = await fetch(`http://up.abyss.to/${userApiKey}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: directDownloadUrl, name: cleanTitle })
                            });
                            const abyssData = await abyssRes.json();
                            if (abyssData.url) {
                                directDownloadUrl = abyssData.url;
                                fileStatus = 'Active';
                            }
                        }
                    }
                } catch (nodeErr) {
                    console.error(`${selectedNode} Remote Upload Error:`, nodeErr);
                }
            } else {
                fileStatus = 'Active';
            }

            const fileRecord = {
                id: fileId,
                name: cleanTitle,
                size: fileSize,
                quality: '1080p WEB-DL',
                date: new Date().toISOString().split('T')[0],
                status: fileStatus,
                url: `${baseUrl}/file/${fileId}`,
                embed_url: `${baseUrl}/embed/${fileId}`,
                original_url: directDownloadUrl,
                user_id: userId || null
            };

            const { error: dbError } = await supabase
                .from('files')
                .insert([fileRecord]);

            if (dbError) {
                console.error('Supabase DB Insert Error:', dbError);
                return NextResponse.json({ error: `Database Error: ${dbError.message}` }, { status: 500 });
            }

            processedFiles.push(fileRecord);
        }

        return NextResponse.json({ 
            success: true, 
            count: processedFiles.length, 
            files: processedFiles 
        });

    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}