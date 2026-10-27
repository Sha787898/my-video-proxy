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
        const selectedNode = (uploadType && uploadType !== 'gdrive') ? uploadType : 'abyss';

        let userApiKey = null;
        if (userId) {
            try {
                const { data: settingData } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('user_id', userId)
                    .eq('key', `${selectedNode}_api_key`)
                    .single();

                if (settingData) userApiKey = settingData.value;
            } catch (err) {
                console.error('Settings fetch error:', err);
            }
        }

        if (!userApiKey) {
            if (selectedNode === 'abyss') {
                userApiKey = 'd6dfaae96764d5bce6fe82fe9b739ac5';
            } else if (selectedNode === 'vidmoly') {
                userApiKey = '633641ic28k4pnr23qck42';
            }
        }

        for (const fileUrl of linkArray) {
            const fileId = Math.random().toString(36).substring(2, 10);
            let cleanTitle = `Media_File_${fileId}.mp4`;
            let fileSize = 'Unknown Size';
            let directDownloadUrl = fileUrl;

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
                        
                        if (driveData && driveData.name) cleanTitle = driveData.name;
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

            // Database Record with Processing status and embed_url
            const fileRecord = {
                id: fileId,
                name: cleanTitle,
                size: fileSize,
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

            if (dbError) {
                console.error('DB Insert Error:', dbError);
                continue;
            }

            processedFiles.push(fileRecord);

            // Background Upload matching the exact Abyss API Spec (multipart/form-data with file)
            (async () => {
                try {
                    let finalWatchUrl = directDownloadUrl;
                    let newStatus = 'Active';

                    if (selectedNode === 'abyss' && userApiKey) {
                        // 1. Fetch file stream/blob from Google Drive
                        const gdriveFileRes = await fetch(directDownloadUrl);
                        if (gdriveFileRes.ok) {
                            const fileBlob = await gdriveFileRes.blob();
                            
                            // 2. Build multipart/form-data payload
                            const formData = new FormData();
                            formData.append('file', fileBlob, cleanTitle);

                            // 3. POST request to Abyss official upload endpoint
                            const abyssRes = await fetch(`https://up.abyss.to/${userApiKey}`, {
                                method: 'POST',
                                body: formData
                            });
                            
                            const abyssData = await abyssRes.json();
                            if (abyssData && abyssData.slug) {
                                finalWatchUrl = `https://abyss.to/${abyssData.slug}`;
                            } else if (abyssData && abyssData.url) {
                                finalWatchUrl = abyssData.url;
                            }
                        }
                    } else if (selectedNode === 'vidmoly' && userApiKey) {
                        const vidmolyRes = await fetch(`https://vidmoly.me/api/upload/url?key=${userApiKey}&url=${encodeURIComponent(directDownloadUrl)}`);
                        const vidmolyData = await vidmolyRes.json();
                        if (vidmolyData && vidmolyData.result && (vidmolyData.result.filecode || vidmolyData.result.url)) {
                            finalWatchUrl = vidmolyData.result.url || `https://vidmoly.me/w/${vidmolyData.result.filecode}`;
                        }
                    }

                    // Update database with active status and final stream URL
                    await supabase
                        .from('files')
                        .update({ original_url: finalWatchUrl, status: newStatus })
                        .eq('id', fileId);

                } catch (bgErr) {
                    console.error('Background Upload Error:', bgErr);
                }
            })();
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