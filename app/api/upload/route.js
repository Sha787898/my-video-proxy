import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
    try {
        const body = await request.json();
        const { fileUrl, fileName } = body;

        if (!fileUrl) {
            return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
        }

        // ডাটাবেজ থেকে Abyss API Key ফেচ করা (না থাকলে ডিফল্ট কি ব্যবহার হবে)
        const { data: settingData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'abyss_api_key')
            .single();

        const apiKey = settingData ? settingData.value : 'd6dfaae96764d5bce6fe82fe9b739ac5';

        // Abyss Upload Endpoint Call
        const abyssUploadUrl = `http://up.abyss.to/${apiKey}`;
        
        // এখানে রিমোট ফাইল বা লিংক Abyss সার্ভারে পুশ করা হচ্ছে
        // (নোট: অনেক সময় রিমোট সার্ভার URL থেকে সরাসরি ফাইল গ্রহণ করে অথবা FormData চায়)
        const response = await fetch(abyssUploadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: fileUrl, name: fileName })
        });

        const result = await response.json();

        // যদি Abyss সার্ভার থেকে সাকসেসফুল রেসপন্স ও ফাইনাল লিংক পাওয়া যায়
        const finalDownloadUrl = result.url || fileUrl; // ফলব্যাক হিসেবে ডাইরেক্ট লিংক
        const fileId = Math.random().toString(36).substring(2, 8);

        const newFileRecord = {
            id: fileId,
            name: fileName || fileUrl.split('/').pop() || `Abyss_Video_${fileId}.mp4`,
            size: 'N/A',
            quality: '1080p WEB-DL',
            date: new Date().toISOString().split('T')[0],
            status: 'Active',
            url: finalDownloadUrl
        };

        // Supabase-এর files টেবিলে সেভ করা
        const { error: dbError } = await supabase
            .from('files')
            .insert([newFileRecord]);

        if (dbError) {
            throw new Error(dbError.message);
        }

        return NextResponse.json({ success: true, file: newFileRecord });

    } catch (err) {
        console.error('Upload API Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}