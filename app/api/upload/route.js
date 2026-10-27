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

        // সিকিউরিটি ও ডায়নামিক ডোমেইন ডিটেকশন (Vercel বা Custom Domain)
        const host = request.headers.get('host') || 'my-video-proxy-three.vercel.app';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = `${protocol}://${host}`;

        // মাল্টিলাইন বা সিঙ্গেল লিংক হ্যান্ডেল করার অ্যারে কনভার্শন
        const linkArray = typeof links === 'string' 
            ? links.split('\n').map(l => l.trim()).filter(l => l.length > 0)
            : links;

        const processedFiles = [];

        for (const fileUrl of linkArray) {
            const fileId = Math.random().toString(36).substring(2, 10);
            
            let cleanTitle = fileName && fileName.trim() !== '' ? fileName : '';
            let directDownloadUrl = fileUrl;

            // Google Drive লিংক বা File ID থেকে ডাইরেক্ট ডাউনলোড লিংক জেনারেট করার লজিক
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
            // ফাইল ম্যানেজারে আগে দেখানোর জন্য এবং ডুপ্লিকেট চেক করতে ডিফল্ট স্ট্যাটাস 'Processing' রাখা হলো
            let fileStatus = 'Processing';

            // Abyss বা অন্যান্য সার্ভারে পুশ করার লজিক
            if (uploadType === 'abyss' || uploadType === 'gdrive') {
                const { data: settingData } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'abyss_api_key')
                    .single();

                const apiKey = settingData ? settingData.value : 'd6dfaae96764d5bce6fe82fe9b739ac5';
                const abyssUploadUrl = `http://up.abyss.to/${apiKey}`;
                
                try {
                    const abyssRes = await fetch(abyssUploadUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: directDownloadUrl, name: cleanTitle })
                    });
                    const abyssResult = await abyssRes.json();
                    if (abyssResult.url) {
                        directDownloadUrl = abyssResult.url;
                        fileStatus = 'Active'; // আপলোড সফল হলে স্ট্যাটাস Active হবে
                    }
                } catch (err) {
                    console.error('Server Mirror Error:', err);
                }
            } else {
                fileStatus = 'Active';
            }

            // সিস্টেমের নিজস্ব ডোমেইন দিয়ে ডাউনলোড ও এম্বেড লিংক তৈরি
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

            // Supabase ডাটাবেজে পার্মানেন্টলি সেভ করা
            const { error: dbError } = await supabase
                .from('files')
                .insert([fileRecord]);

            if (!dbError) {
                processedFiles.push(fileRecord);
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