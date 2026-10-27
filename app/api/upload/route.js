import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
    try {
        const body = await request.json();
        const { links, uploadType, userId } = body; // links হতে পারে একটি অ্যারে বা মাল্টিলাইন স্ট্রিং

        if (!links || (Array.isArray(links) && links.length === 0)) {
            return NextResponse.json({ error: 'No links provided' }, { status: 400 });
        }

        // যদি সিঙ্গেল স্ট্রিং বা মাল্টিলাইন হয়, তবে লাইন বাই লাইন স্প্লিট করে নেওয়া
        const linkArray = typeof links === 'string' 
            ? links.split('\n').map(l => l.trim()).filter(l => l.length > 0)
            : links;

        const insertedFiles = [];

        for (const fileUrl of linkArray) {
            const fileId = Math.random().toString(36).substring(2, 8);
            let finalDownloadUrl = fileUrl;
            let fileType = 'Google Cloud Drive';
            let fileSize = '15 GB Limit';
            let autoTitle = `GDrive_File_${fileId}`;

            if (uploadType === 'abyss') {
                fileType = 'Abyss.to';
                fileSize = 'Unlimited';
                const { data: settingData } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'abyss_api_key')
                    .single();

                const apiKey = settingData ? settingData.value : 'd6dfaae96764d5bce6fe82fe9b739ac5';
                const abyssUploadUrl = `http://up.abyss.to/${apiKey}`;
                
                try {
                    const response = await fetch(abyssUploadUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: fileUrl, name: autoTitle })
                    });
                    const result = await response.json();
                    if (result.url) {
                        finalDownloadUrl = result.url;
                    }
                } catch (abyssErr) {
                    console.error('Abyss server error:', abyssErr);
                }
            }

            const newFileRecord = {
                id: fileId,
                name: autoTitle,
                size: fileSize,
                quality: '1080p WEB-DL',
                date: new Date().toISOString().split('T')[0],
                status: 'Active',
                url: finalDownloadUrl,
                user_id: userId || null
            };

            const { error: dbError } = await supabase
                .from('files')
                .insert([newFileRecord]);

            if (!dbError) {
                insertedFiles.push(newFileRecord);
            }
        }

        return NextResponse.json({ success: true, count: insertedFiles.length, files: insertedFiles });

    } catch (err) {
        console.error('Upload API Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}