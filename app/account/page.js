'use client';

export default function AccountSettingsPage() {
    return (
        <div className="p-4 lg:p-6 pb-12 max-w-5xl mx-auto w-full space-y-6">
            {/* Account Header Card */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 lg:p-8 shadow-xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="relative flex-shrink-0">
                    <img src="https://i.ibb.co/spQp02Zf/account-avatar-profile-user.jpg" alt="User Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-slate-900 shadow-lg" />
                    <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-slate-900 uppercase tracking-wider shadow">
                        PREMIUM
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white truncate mb-1">Shabid Al Hasan</h2>
                    <p className="text-slate-400 text-xs font-mono mb-1">admin@multiserver.top</p>
                    <p className="text-slate-500 text-xs font-mono mb-3">UID: <span className="text-blue-400 font-semibold">ms_9a482f6b3</span></p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900/60 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300">
                            <i className="fa-solid fa-calendar-days text-blue-400"></i> Joined: October 2026
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900/60 border border-slate-700 rounded-lg text-xs font-semibold text-emerald-400">
                            <i className="fa-solid fa-circle-check text-[10px]"></i> Status: ACTIVE
                        </span>
                    </div>
                </div>
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
                {/* Website Details Card */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/15 text-blue-400 flex items-center justify-center text-lg flex-shrink-0 border border-blue-500/20">
                                <i className="fa-solid fa-globe"></i>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Website Details</h3>
                                <p className="text-xs text-slate-400">Your registered site identity</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Site / Brand Tag</label>
                            <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-white truncate shadow-inner">
                                multiserver
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Website URL / Domain</label>
                            <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-blue-400 truncate flex items-center justify-between shadow-inner">
                                <a href="https://multiserver.top" target="_blank" className="truncate hover:underline pr-2">
                                    https://multiserver.top
                                </a>
                                <i className="fa-solid fa-external-link text-[11px] text-slate-500 flex-shrink-0"></i>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Tier Card */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col justify-between h-full">
                    <div>
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700">
                            <div className="w-10 h-10 rounded-xl bg-purple-600/15 text-purple-400 flex items-center justify-center text-lg flex-shrink-0 border border-purple-500/20">
                                <i className="fa-solid fa-crown"></i>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Subscription Tier</h3>
                                <p className="text-xs text-slate-400">Included features & active quotas</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center justify-between shadow-inner">
                                <span>MultiServer Pro Plan</span>
                                <span className="text-xs font-semibold text-slate-400 lowercase">unlimited</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-xl">
                                    <span className="text-slate-400 block mb-0.5">Storage Limit</span>
                                    <span className="font-bold text-white">Unlimited</span>
                                </div>
                                <div className="bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-xl">
                                    <span className="text-slate-400 block mb-0.5">Streaming Nodes</span>
                                    <span className="font-bold text-emerald-400">5 Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}