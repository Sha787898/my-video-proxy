import { NextResponse } from 'next/server';

const WORKER_URL = 'https://multiserver-worker.shabidalhasan.workers.dev';

export async function POST(request) {
    try {
        const body = await request.json();

        // ফ্রন্টএন্ড থেকে পাওয়া রিকোয়েস্টটি সরাসরি ক্লাউডফ্লায়ার Worker-এ পাঠিয়ে দেওয়া হচ্ছে
        const workerResponse = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await workerResponse.json();

        return NextResponse.json(result, { status: workerResponse.status });

    } catch (err) {
        console.error('Proxy Error to Cloudflare Worker:', err);
        return NextResponse.json({ error: err.message || 'Proxy Error' }, { status: 500 });
    }
}