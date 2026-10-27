import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function EmbedPage({ params }) {
    const { id } = params;

    // Database theke file data fetch kora
    const { data: file, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !file) {
        notFound();
    }

    // Dynamic Server List mapping from file original url / mirrors
    const currentServers = [
        { key: 'abyss', name: 'Abyss (Default)', url: file.original_url || 'https://abyssplayer.com/', icon: 'fa-play' },
        { key: 'vidmoly', name: 'Vidmoly', url: file.original_url?.includes('vidmoly') ? file.original_url : 'https://vidmoly.me/', icon: 'fa-play' }
    ];

    return (
        <html lang="en">
        <head>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Stream {file.name} - TOXcloud Player</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                :root { --accent-color: #ef4444; --accent-rgb: 239, 68, 68; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { background-color: #05070d; color: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; width: 100%; height: 100dvh; position: fixed; top: 0; left: 0; overflow: hidden; letter-spacing: -0.01em; }
                .player-wrapper { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
                #player-frame { width: 100%; height: 100%; border: none; display: none; }
                .center-spinner-wrapper { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; z-index: 10; pointer-events: none; transition: opacity 0.3s ease; }
                .center-spinner { width: 44px; height: 44px; border: 3px solid rgba(var(--accent-rgb), 0.1); border-top: 3px solid var(--accent-color); border-right: 3px solid rgba(var(--accent-rgb), 0.4); border-radius: 50%; animation: spin 0.75s cubic-bezier(0.4, 0, 0.2, 1) infinite; filter: drop-shadow(0 0 12px rgba(var(--accent-rgb), 0.45)); }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .menu-trigger { position: absolute; top: 10px; left: 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.14); color: #f1f5f9; padding: 0 12px; height: 32px; border-radius: 8px; font-size: 10.5px; font-weight: 700; cursor: pointer; z-index: 99998; display: flex; align-items: center; gap: 7px; backdrop-filter: blur(18px); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5); transition: all 0.25s ease; text-transform: uppercase; letter-spacing: 0.5px; }
                .menu-trigger:hover { background: rgba(30, 41, 59, 0.95); border-color: rgba(var(--accent-rgb), 0.4); color: var(--accent-color); }
                .server-overlay { position: absolute; top: 48px; left: 10px; background: rgba(10, 15, 29, 0.94); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; width: 215px; z-index: 99999; display: flex; flex-direction: column; padding: 7px; backdrop-filter: blur(24px); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85); opacity: 0; pointer-events: none; transform: translateY(-6px) scale(0.96); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
                .server-overlay.open { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }
                .server-overlay-header { font-size: 9.5px; color: #64748b; text-transform: uppercase; padding: 3px 5px 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 6px; font-weight: 700; }
                .server-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; color: #94a3b8; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 10.5px; font-weight: 600; transition: all 0.18s ease; text-transform: uppercase; }
                .server-item:hover { background: rgba(255, 255, 255, 0.07); color: #f8fafc; }
                .server-item.active { color: #f8fafc; border-color: rgba(16, 185, 129, 0.45); background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%); }
                .corner-status-pill { position: absolute; bottom: 14px; left: 14px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(255, 255, 255, 0.12); padding: 5px 12px; border-radius: 999px; display: flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 600; color: #cbd5e1; z-index: 99999; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7); opacity: 0; transform: translateY(8px); transition: 0.3s; pointer-events: none; }
                .corner-status-pill.show { opacity: 1; transform: translateY(0); }
                .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
                .error-wrapper { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #05070d; display: flex; align-items: center; justify-content: center; z-index: 5; display: none; }
                .error-card { background: rgba(15, 23, 42, 0.9); border-radius: 18px; padding: 26px 22px; width: 240px; display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px solid rgba(239, 68, 68, 0.25); }
                .hidden { display: none !important; }
            `}} />
        </head>
        <body>
            <div className="player-wrapper">
                <div className="center-spinner-wrapper" id="centerSpinner">
                    <div className="center-spinner"></div>
                </div>
                <div className="error-wrapper" id="errorBox">
                    <div className="error-card">
                        <i className="fas fa-video-slash" style={{fontSize: '34px', marginBottom: '12px', color: '#ef4444'}}></i>
                        <h2 style={{fontSize: '14px', marginBottom: '5px', color: '#fff'}}>System Error</h2>
                        <p style={{fontSize: '10.5px', color: '#94a3b8'}}>File stream unavailable</p>
                    </div>
                </div>
                <iframe id="player-frame" allowFullScreen={true} webkitallowfullscreen="true" mozallowfullscreen="true"></iframe>
            </div>
            
            <div id="cornerStatus" className="corner-status-pill">
                <div className="status-dot"></div>
                <span id="statusText">Connected</span>
            </div>

            <div id="uiOverlay">
                <button className="menu-trigger" id="menuBtn">
                    <i className="fas fa-server" id="menuIcon"></i> <span id="activeServerName">Abyss</span>
                </button>
                <div className="server-overlay" id="serverMenu">
                    <div className="server-overlay-header"><span>Select streaming server</span></div>
                    <div id="serverButtons" style={{display: 'flex', flexDirection: 'column', gap: '4px'}}></div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: `
                const currentServers = ${JSON.stringify(currentServers)};
                const centerSpinner = document.getElementById('centerSpinner');
                const iframe = document.getElementById('player-frame');
                const menuBtn = document.getElementById('menuBtn');
                const menuIcon = document.getElementById('menuIcon');
                const serverMenu = document.getElementById('serverMenu');
                const serverButtonsContainer = document.getElementById('serverButtons');
                const activeServerNameSpan = document.getElementById('activeServerName');
                const cornerStatus = document.getElementById('cornerStatus');
                const statusText = document.getElementById('statusText');

                function initPlayer() {
                    if (!currentServers || currentServers.length === 0) return;
                    
                    serverButtonsContainer.innerHTML = "";
                    currentServers.forEach((srv, index) => {
                        const btn = document.createElement('button');
                        btn.className = \`server-item \${index === 0 ? 'active' : ''}\`;
                        btn.innerHTML = \`<div style="display:flex;align-items:center;gap:8px;"><i class="fas \${srv.icon}"></i> \${srv.name}</div>\`;
                        btn.onclick = () => {
                            serverMenu.classList.remove('open');
                            iframe.src = srv.url;
                            activeServerNameSpan.innerText = srv.name;
                            document.querySelectorAll('.server-item').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                        };
                        serverButtonsContainer.appendChild(btn);
                    });

                    // Load default first server
                    iframe.src = currentServers[0].url;
                    activeServerNameSpan.innerText = currentServers[0].name;

                    iframe.onload = () => {
                        centerSpinner.classList.add('hidden');
                        iframe.style.display = 'block';
                        cornerStatus.classList.add('show');
                        setTimeout(() => cornerStatus.classList.remove('show'), 3000);
                    };
                }

                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    serverMenu.classList.toggle('open');
                });

                document.addEventListener('click', () => {
                    serverMenu.classList.remove('open');
                });

                window.onload = initPlayer;
            `}} />
        </body>
        </html>
    );
}