'use client';

import Sidebar from '../components/Sidebar';
import { IconUser, IconCopy } from '../components/Icons';

export default function AccountSettingsPage() {
    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center"><IconUser size={18} /></span>
                        <h1 className="ms-h1 truncate">Account &amp; API settings</h1>
                    </div>
                </header>
                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    <div className="ms-card ms-fade-up p-4 sm:p-6 space-y-5 max-w-3xl">
                        <h2 className="ms-h2">Admin profile &amp; API credentials</h2>
                        <div>
                            <label htmlFor="admin-email" className="ms-label">Administrator email</label>
                            <input id="admin-email" type="email" readOnly value="admin@multiserver.top" className="ms-input text-slate-300" />
                        </div>
                        <div>
                            <label htmlFor="api-key" className="ms-label">Master API key</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input id="api-key" type="password" readOnly value="ms_live_998374a819b2c77f" className="ms-input flex-1 min-w-0 text-slate-300" />
                                <button onClick={() => alert('API Key Copied!')} className="ms-btn ms-btn-primary"><IconCopy size={16} /> Copy</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
