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

        let userApiKey = 'default_fallback_key';
        if (userId) {
            const { data: settingData } = await supabase
                .from('settings')
                .select('value')
                .eq('user_id', userId)
                .eq('key', 'api_key')
                .single();
            
            if (settingData && settingData.value) userApiKey = settingData.value;
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
                    'X-API-Key': userApiKey
                },
                body: JSON.stringify({
                    driveUrl: link,
                    uploadType: uploadType || 'abyss'
                })
            });

            const resData = await workerRes.json();
            const fileInfo = resData.data || {};
            const workerResults = fileInfo.results || {};

            let formattedSize = 'Unknown Size';
            if (fileInfo.size) {
                const bytes = parseInt(fileInfo.size, 10);
                formattedSize = bytes > 1024 * 1024 * 1024 
                    ? (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB' 
                    : (bytes / (1024 * 1024)).toFixed(2) + ' MB';
            }

            // Pick the first successful remote mirror link from worker results
            let bestMirrorLink = 'Processing Mirror Links...';
            if (workerResults.pixeldrain && !workerResults.pixeldrain.startsWith('Failed')) {
                bestMirrorLink = `https://pixeldrain.com/u/${workerResults.pixeldrain}`;
            } else if (workerResults.gofile && !workerResults.gofile.startsWith('Failed')) {
                bestMirrorLink = `https://gofile.io/d/${workerResults.gofile}`;
            } else if (workerResults.abyss && !workerResults.abyss.startsWith('Failed')) {
                bestMirrorLink = `https://hydrax.net/${workerResults.abyss}`;
            } else if (workerResults.vidmoly && !workerResults.vidmoly.startsWith('Failed')) {
                bestMirrorLink = `https://vidmoly.me/w/${workerResults.vidmoly}`;
            } else if (workerResults.mixdrop && !workerResults.mixdrop.startsWith('Failed')) {
                bestMirrorLink = `https://mixdrop.ag/f/${workerResults.mixdrop}`;
            }

            const formattedResult = {
                id: fileInfo.id || Math.random().toString(36).substring(2, 10),
                name: fileInfo.title || 'GDrive_Video.mp4',
                size: formattedSize,
                status: resData.status === 'success' ? 'Active' : 'error',
                download_link: bestMirrorLink,
                url: bestMirrorLink,
                original_url: link,
                results: workerResults
            };

            // Save to Supabase for local history
            try {
                await supabase.from('files').insert([{
                    id: formattedResult.id,
                    name: formattedResult.name,
                    size: formattedResult.size,
                    quality: '1080p WEB-DL',
                    date: new Date().toISOString().split('T')[0],
                    status: formattedResult.status,
                    download_link: bestMirrorLink,
                    original_url: link,
                    user_id: userId || null
                }]);
            } catch (dbErr) {
                console.error('Supabase insert warning:', dbErr);
            }

            results.push(formattedResult);
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