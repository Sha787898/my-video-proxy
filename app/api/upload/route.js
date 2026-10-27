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
        
        // Jodi uploadType 'gdrive' hoy ba faka thake, tahole default remote node 'vidmoly' dhore nibe
        const selectedNode = (uploadType && uploadType !== 'gdrive') ? uploadType : 'vidmoly';

        // 1. User-specific API key fetch kora (shudhu vidmoly ba abyss-er jonno)
        let userApiKey = null;
        if (userId) {
            const { data: settingData, error: settingErr } = await supabase
                .from('settings')
                .select('value')
                .eq('user_id', userId)
                .eq('key', `${selectedNode}_api_key`)
                .single();

            if (!settingErr && settingData) {
                userApiKey = settingData.value;
            }
        }

        if (!userApiKey) {
            return NextResponse.json({ 
                error: `No API Key found for ${selectedNode}. Please add your API key in 'Manage Sites & Keys' page first.` 
            }, { status: 400 });
        }

        for (const fileUrl of linkArray) {
            const fileId = Math.random().toString(36).substring(2, 10);
            let cleanTitle = `Media_File_${fileId}.mp4`;
            let fileSize = 'Unknown Size';
            let directDownloadUrl = fileUrl;

            // 2. Google Drive ID Extraction & Real Metadata Fetching
            const driveMatch = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
            if (driveMatch && driveMatch[1]) {
                const gId = driveMatch[1];
                directDownloadUrl = `https://drive.google.com/uc?export=download&id=${gId}`;
                cleanTitle = `GDrive_Video_${gId.substring(0, 6)}.mp4`;

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

            let finalWatchUrl = directDownloadUrl;
            let fileStatus = 'Processing';

            // 3. Remote Upload Execution to Vidmoly or Abyss
            if (selectedNode === 'vidmoly') {
                const vidmolyApiUrl = `https://vidmoly.me/api/upload/url?key=${userApiKey}&url=${encodeURIComponent(directDownloadUrl)}`;
                const vidmolyRes = await fetch(vidmolyApiUrl);
                const vidmolyData = await vidmolyRes.json();
                
                if (vidmolyData && vidmolyData.result && vidmolyData.result.filecode) {
                    finalWatchUrl = `https://vidmoly.me/w/${vidmolyData.result.filecode}`;
                    fileStatus = 'Active';
                } else {
                    return NextResponse.json({ 
                        error: `Vidmoly Remote Upload Failed: ${JSON.stringify(vidmolyData)}` 
                    }, { status: 400 });
                }
            } else if (selectedNode === 'abyss') {
                const abyssRes = await fetch(`https://up.abyss.to/${userApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: directDownloadUrl, name: cleanTitle })
                });
                const abyssData = await abyssRes.json();
                
                if (abyssData && abyssData.url) {
                    finalWatchUrl = abyssData.url;
                    fileStatus = 'Active';
                } else {
                    return NextResponse.json({ 
                        error: `Abyss Remote Upload Failed: ${JSON.stringify(abyssData)}` 
                    }, { status: 400 });
                }
            }

            // 4. Database Insert
            const fileRecord = {
                id: fileId,
                name: cleanTitle,
                size: fileSize,
                quality: '1080p WEB-DL',
                date: new Date().toISOString().split('T')[0],
                status: fileStatus,
                url: `${baseUrl}/file/${fileId}`,
                original_url: finalWatchUrl,
                user_id: userId || null
            };

            const { error: dbError } = await supabase
                .from('files')
                .insert([fileRecord]);

            if (dbError) {
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
        console.error('API Critical Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}