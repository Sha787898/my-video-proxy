'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { IconEye, IconEyeOff, IconAlert, IconCheckCircle, IconRefresh, IconKey } from '../components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResetPasswordPage() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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

    const isError = status.startsWith('Error');
    const isSuccess = status.startsWith('Password updated');

    return (
        <div className="ms-app flex items-center justify-center px-4 py-8">
            <div className="ms-card ms-fade-up w-full max-w-md p-5 sm:p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white mx-auto ">
                        <IconKey size={26} />
                    </div>
                    <h1 className="ms-h1">Set new password</h1>
                    <p className="text-sm ms-muted">Choose a strong password for your account.</p>
                </div>

                {status && (
                    <div className={`ms-alert ${isError ? 'ms-alert-red' : isSuccess ? 'ms-alert-green' : 'ms-alert-blue'}`} role={isError ? 'alert' : 'status'}>
                        {isError ? <IconAlert size={16} className="shrink-0 mt-0.5" /> : <IconCheckCircle size={16} className="shrink-0 mt-0.5" />}
                        <span className="min-w-0 break-words">{status}</span>
                    </div>
                )}

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                        <label htmlFor="new-password" className="ms-label">New password</label>
                        <div className="relative">
                            <input
                                id="new-password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="ms-input pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-lg"
                            >
                                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="ms-btn ms-btn-primary ms-btn-block">
                        {loading ? <><IconRefresh size={16} className="ms-spin" /> Updating…</> : 'Update password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
