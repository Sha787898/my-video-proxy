'use client';

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { kick } from '../utils/queueRunner';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// invisible: keeps the mirror queue moving on every page that has the sidebar
export default function QueueRunner() {
    useEffect(() => {
        kick(supabase);
        const t = setInterval(() => kick(supabase), 12000);
        return () => clearInterval(t);
    }, []);
    return null;
}
