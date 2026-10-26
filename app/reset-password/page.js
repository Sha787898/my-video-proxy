'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResetPasswordPage() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus('');

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            setStatus(`Error: ${error.message}`);
        } else {
            setStatus('Password updated successfully! Redirecting to login...');
            setTimeout(() => router.push('/login'), 2000);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
                <h1 className="text-xs font-bold text-white uppercase text-center tracking-wider">Set New Password</h1>

                {status && <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 text-xs text-center">{status}</div>}

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase">New Password</label>
                        <input 
                            type="password"
                            required
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-600"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}