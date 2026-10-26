cat << 'EOF' > app/components/Sidebar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: 'fa-chart-pie' },
        { name: 'File Manager', href: '/files', icon: 'fa-folder-open' },
        { name: 'Manage Sites', href: '/manage-sites', icon: 'fa-globe' },
        { name: 'Web Upload', href: '/web-upload', icon: 'fa-cloud-arrow-up' },
        { name: 'GDrive Upload', href: '/gdrive-upload', icon: 'fa-brands fa-google-drive' },
        { name: 'Embed Generator', href: '/remote-upload', icon: 'fa-wand-magic-sparkles' },
        { name: 'Processing Files', href: '/processing-files', icon: 'fa-rotate' },
        { name: 'Analytics', href: '/analytics', icon: 'fa-chart-line' },
        { name: 'More Settings', href: '/more-settings', icon: 'fa-sliders' },
        { name: 'Account Settings', href: '/account', icon: 'fa-user-gear' },
    ];

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col justify-between p-6 shrink-0">
            <div className="space-y-6">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <i className="fa-solid fa-server text-white text-sm"></i>
                    </div>
                    <span className="text-base font-extrabold tracking-wide text-white uppercase font-mono">
                        Multi<span className="text-blue-500">Server</span>
                    </span>
                </Link>

                <nav className="space-y-1 pt-2 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                            >
                                <i className={`fa-solid ${item.icon} w-4 text-center`}></i>
                                <span className="truncate">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 font-mono flex items-center justify-between">
                <span>Node: Online</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
        </aside>
    );
}
EOF