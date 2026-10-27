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

        // Get User API Key or fallback token from Supabase settings
        let userApiKey = '';
        if (userId) {
            const { data: settingData } = await supabase
                .from('settings')
                .select('value')
                .eq('user_id', userId)
                .eq('key', 'api_key')
                .single();
            
            if (settingData) userApiKey = settingData.value;
        }

        const linkArray = links.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.includes('1xxxxxxx') && !l.includes('2xxxxxxx'));

        if (linkArray.length === 0) {
            return NextResponse.json({ error: 'Please enter valid Google Drive links' }, { status: 400 });
        }

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

            // Insert file record into Supabase so it appears in File Manager
            if (resData.status === 'success' || resData.data) {
                const fileInfo = resData.data || {};
                await supabase.from('files').insert([{
                    id: fileInfo.id || Math.random().toString(36).substring(2, 10),
                    name: fileInfo.title || 'GDrive_File.mp4',
                    size: 'Processing...',
                    quality: '1080p WEB-DL',
                    date: new Date().toISOString().split('T')[0],
                    status: 'Active',
                    original_url: link,
                    user_id: userId || null
                }]);
            }

            results.push(resData);
        }

        return NextResponse.json({ 
            success: true, 
            count: results.length,
            files: results 
        });

    } catch (err) {
        console.error('Proxy Route Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}