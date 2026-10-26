'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
    
    // Form Inputs
    const [loginInput, setLoginInput] = useState(''); // Email or Username
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [website, setWebsite] = useState('');
    const [captchaChecked, setCaptchaChecked] = useState(false);

    // Feedback States
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // --- Sign In Handler ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        let loginEmail = loginInput.trim();

        // If user typed a username instead of email, fetch their email first
        if (!loginEmail.includes('@')) {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', loginEmail)
                .single();

            if (error || !data) {
                setErrorMsg('Username not found.');
                setLoading(false);
                return;
            }
            
            // Get user email from admin/rpc or direct email login
            setErrorMsg('Please log in using your registered Gmail/Email.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: password,
        });

        if (error) {
            setErrorMsg(error.message);
        } else {
            router.push('/');
        }
        setLoading(false);
    };

    // --- Sign Up Handler ---
    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!captchaChecked) {
            setErrorMsg('Please complete the reCAPTCHA verification.');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        // Check if username is already taken
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username.trim().toLowerCase())
            .single();

        if (existingUser) {
            setErrorMsg('Username is already taken. Please choose another.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: {
                    username: username.trim().toLowerCase(),
                    full_name: fullName.trim(),
                    website: website.trim(),
                }
            }
        });

        if (error) {
            setErrorMsg(error.message);
        } else {
            setSuccessMsg('Account created successfully! Check your email for verification link.');
            setMode('login');
        }
        setLoading(false);
    };

    // --- Forgot / Reset Password Handler ---
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setErrorMsg(error.message);
        } else {
            setSuccessMsg('Password reset link sent to your Gmail/Email!');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
                
                {/* Brand Logo */}
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-xl mx-auto shadow-lg shadow-blue-600/30">
                        MS
                    </div>
                    <h1 className="text-sm font-bold text-white uppercase tracking-wider">MultiServer Cloud</h1>
                    <p className="text-[11px] text-slate-400">
                        {mode === 'login' && 'Sign in to access your proxy vault'}
                        {mode === 'signup' && 'Create your MultiServer publisher account'}
                        {mode === 'forgot' && 'Reset your lost password'}
                    </p>
                </div>

                {/* Notifications */}
                {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center font-bold">
                        ⚠️ {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 text-center font-bold">
                        ✅ {successMsg}
                    </div>
                )}

                {/* 1. SIGN IN FORM */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase">Gmail or Email</label>
                            <input 
                                type="text"
                                required
                                placeholder="name@domain.com"
                                value={loginInput}
                                onChange={(e) => setLoginInput(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] text-slate-400 uppercase">Password</label>
                                <button 
                                    type="button" 
                                    onClick={() => setMode('forgot')}
                                    className="text-[10px] text-blue-400 hover:underline"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <input 
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>
                )}

                {/* 2. SIGN UP FORM */}
                {mode === 'signup' && (
                    <form onSubmit={handleSignUp} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase">Username</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="shabid_dev"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-600"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase">Full Name</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="Shabid Al Hasan"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase">Gmail / Email</label>
                            <input 
                                type="email"
                                required
                                placeholder="shabid@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase">Website / Platform URL</label>
                            <input 
                                type="url"
                                placeholder="https://multishows.top"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase">Password</label>
                            <input 
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        {/* reCAPTCHA Widget Box */}
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                                <input 
                                    type="checkbox"
                                    checked={captchaChecked}
                                    onChange={(e) => setCaptchaChecked(e.target.checked)}
                                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                                />
                                I am not a robot
                            </label>
                            <span className="text-[9px] text-slate-500 font-bold">reCAPTCHA</span>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
                        >
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>
                )}

                {/* 3. FORGOT PASSWORD FORM */}
                {mode === 'forgot' && (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase">Enter Your Gmail / Email</label>
                            <input 
                                type="email"
                                required
                                placeholder="name@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
                        >
                            {loading ? 'Sending Link...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                {/* Switch Mode Links */}
                <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
                    {mode === 'login' && (
                        <p>
                            Don't have an account?{' '}
                            <button onClick={() => { setMode('signup'); setErrorMsg(''); }} className="text-blue-400 font-bold hover:underline">
                                Sign Up
                            </button>
                        </p>
                    )}
                    {(mode === 'signup' || mode === 'forgot') && (
                        <p>
                            Already registered?{' '}
                            <button onClick={() => { setMode('login'); setErrorMsg(''); }} className="text-blue-400 font-bold hover:underline">
                                Back to Sign In
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}