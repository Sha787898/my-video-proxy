import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const WORKER_URL = 'https://multiserver-worker.shabidalhasan.workers.dev';

export async function POST(request) {
    try {
        const body = await request.json();
        const { links, userId, uploadType } = body;

        if (!links || typeof links !== 'string' || links.trim() === '') {
            return NextResponse.json({ error: 'No links provided' }, { status: 400 });
        }

        // ইউজারের নিজস্ব API Key বা টোকেন সুপাবেজ থেকে ফেচ করা
        let userApiKey = '';
        if (userId) {
            const { data: settingData } = await supabase
                .from('settings')
                .select('value')
                .eq('user_id', userId)
                .eq('key', 'api_key') // অথবা আপনার ইউজার টেবিলের এপিআই কি
                .single();
            
            if (settingData) userApiKey = settingData.value;
        }

        // লিংকগুলোকে এক লাইন এক লাইন করে Worker-এ পাঠানো
        const linkArray = links.split('\n').map(l => l.trim()).filter(Boolean);
        const results = [];

        for (const link of linkArray) {
            const workerRes = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': userApiKey || 'default_fallback_key'
                },
                body: JSON.stringify({
                    driveUrl: link,
                    uploadType: uploadType || 'abyss'
                })
            });

            const resData = await workerRes.json();
            results.push(resData);
        }

        return NextResponse.json({ 
            success: true, 
            count: results.length,
            results: results 
        });

    } catch (err) {
        console.error('Proxy Route Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}