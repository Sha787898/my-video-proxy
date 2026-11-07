'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { IconEye, IconEyeOff, IconAlert, IconCheckCircle, IconRefresh } from '../components/Icons';

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
    const [showPassword, setShowPassword] = useState(false);

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

    const pwField = (id, placeholder) => (
        <div className="relative">
            <input
                id={id}
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={placeholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
    );

    const spinner = <IconRefresh size={16} className="ms-spin" />;

    return (
        <div className="ms-app flex items-center justify-center px-4 py-8">
            <div className="ms-card ms-fade-up w-full max-w-md p-5 sm:p-8 space-y-6">

                {/* Brand */}
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center font-black text-white text-xl mx-auto ">
                        MS
                    </div>
                    <h1 className="ms-h1">MultiServer Cloud</h1>
                    <p className="text-sm ms-muted">
                        {mode === 'login' && 'Sign in to access your proxy vault'}
                        {mode === 'signup' && 'Create your MultiServer publisher account'}
                        {mode === 'forgot' && 'Reset your lost password'}
                    </p>
                </div>

                {/* Notifications */}
                {errorMsg && (
                    <div className="ms-alert ms-alert-red" role="alert">
                        <IconAlert size={16} className="shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{errorMsg}</span>
                    </div>
                )}
                {successMsg && (
                    <div className="ms-alert ms-alert-green" role="status">
                        <IconCheckCircle size={16} className="shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{successMsg}</span>
                    </div>
                )}

                {/* 1. SIGN IN FORM */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label htmlFor="login-email" className="ms-label">Email</label>
                            <input
                                id="login-email"
                                type="text"
                                required
                                autoComplete="username"
                                placeholder="name@domain.com"
                                value={loginInput}
                                onChange={(e) => setLoginInput(e.target.value)}
                                className="ms-input"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <label htmlFor="login-password" className="ms-label !mb-0">Password</label>
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot')}
                                    className="text-xs text-blue-400 hover:underline py-1"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            {pwField('login-password', '••••••••')}
                        </div>

                        <button type="submit" disabled={loading} className="ms-btn ms-btn-primary ms-btn-block">
                            {loading ? <>{spinner} Signing in…</> : 'Sign in'}
                        </button>
                    </form>
                )}

                {/* 2. SIGN UP FORM */}
                {mode === 'signup' && (
                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="su-username" className="ms-label">Username</label>
                                <input
                                    id="su-username"
                                    type="text"
                                    required
                                    placeholder="shabid_dev"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="ms-input"
                                />
                            </div>
                            <div>
                                <label htmlFor="su-fullname" className="ms-label">Full name</label>
                                <input
                                    id="su-fullname"
                                    type="text"
                                    required
                                    placeholder="Shabid Al Hasan"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="ms-input"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="su-email" className="ms-label">Email</label>
                            <input
                                id="su-email"
                                type="email"
                                required
                                placeholder="shabid@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="ms-input"
                            />
                        </div>

                        <div>
                            <label htmlFor="su-website" className="ms-label">Website / platform URL <span className="ms-muted font-normal">(optional)</span></label>
                            <input
                                id="su-website"
                                type="url"
                                placeholder="https://multishows.top"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="ms-input"
                            />
                        </div>

                        <div>
                            <label htmlFor="su-password" className="ms-label">Password</label>
                            {pwField('su-password', '••••••••')}
                        </div>

                        {/* reCAPTCHA box */}
                        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 min-h-[32px]">
                                <input
                                    type="checkbox"
                                    checked={captchaChecked}
                                    onChange={(e) => setCaptchaChecked(e.target.checked)}
                                    className="ms-check"
                                />
                                I am not a robot
                            </label>
                            <span className="text-[10px] text-slate-500 font-bold shrink-0">reCAPTCHA</span>
                        </div>

                        <button type="submit" disabled={loading} className="ms-btn ms-btn-primary ms-btn-block">
                            {loading ? <>{spinner} Creating account…</> : 'Sign up'}
                        </button>
                    </form>
                )}

                {/* 3. FORGOT PASSWORD FORM */}
                {mode === 'forgot' && (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div>
                            <label htmlFor="fp-email" className="ms-label">Your email</label>
                            <input
                                id="fp-email"
                                type="email"
                                required
                                placeholder="name@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="ms-input"
                            />
                            <p className="mt-1.5 text-xs ms-muted">We will send a password reset link to this address.</p>
                        </div>

                        <button type="submit" disabled={loading} className="ms-btn ms-btn-primary ms-btn-block">
                            {loading ? <>{spinner} Sending link…</> : 'Send reset link'}
                        </button>
                    </form>
                )}

                {/* Switch mode links */}
                <div className="pt-4 text-center text-sm ms-muted border-t border-slate-800/80">
                    {mode === 'login' && (
                        <p>
                            Don't have an account?{' '}
                            <button onClick={() => { setMode('signup'); setErrorMsg(''); }} className="text-blue-400 font-bold hover:underline py-1">
                                Sign up
                            </button>
                        </p>
                    )}
                    {(mode === 'signup' || mode === 'forgot') && (
                        <p>
                            Already registered?{' '}
                            <button onClick={() => { setMode('login'); setErrorMsg(''); }} className="text-blue-400 font-bold hover:underline py-1">
                                Back to sign in
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
