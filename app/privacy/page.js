export const metadata = {
    title: 'Privacy Policy',
    description: 'How this service handles your data.',
};

const H = { fontSize: 18, fontWeight: 800, color: '#fff', margin: '28px 0 8px' };
const P = { fontSize: 14.5, lineHeight: 1.7, color: '#b4bfd0', margin: '0 0 10px' };

export default function PrivacyPage() {
    return (
        <main style={{ minHeight: '100vh', background: '#0a0f18', color: '#dfe5ef', padding: '40px 18px' }}>
            <article style={{ maxWidth: 760, margin: '0 auto' }}>
                <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-.02em' }}>Privacy Policy</h1>
                <p style={{ ...P, marginTop: 8 }}>This page explains what this service stores and how it uses Google account access.</p>

                <h2 style={H}>What this service does</h2>
                <p style={P}>This is a private file-mirroring tool. The owner connects a Google account so the service can read the owner&apos;s own Google Drive files and copy them to video hosting servers. It is not offered to the public as a sign-up service.</p>

                <h2 style={H}>Google account access</h2>
                <p style={P}>The service asks for read-only access to Google Drive (the drive.readonly scope) so it can download files that the account owner chose to mirror. It never changes, deletes or shares files in Google Drive. Google user data is used only to perform the download the owner asked for. It is not sold, not shared with third parties and not used for advertising.</p>

                <h2 style={H}>What is stored</h2>
                <p style={P}>The service stores file names, sizes, links to the mirrored copies and the owner&apos;s settings. Access keys (such as a Google refresh token) are kept as server-side secrets and are never shown to visitors.</p>

                <h2 style={H}>Visitor statistics</h2>
                <p style={P}>When a video or download page is opened, the service records the time, country, device type and the referring site to build traffic statistics. IP addresses are not stored; only a one-way hash is kept to count unique visitors. No personal profiles are built.</p>

                <h2 style={H}>Cookies</h2>
                <p style={P}>Only the sign-in session needed for the owner&apos;s dashboard is used. There are no advertising or tracking cookies.</p>

                <h2 style={H}>Data removal</h2>
                <p style={P}>The owner can delete any file from the dashboard at any time, and can revoke Google access at myaccount.google.com/permissions. To ask for removal of a file you believe should not be here, contact the site owner.</p>

                <h2 style={H}>Changes</h2>
                <p style={P}>This policy may be updated when the service changes. The latest version is always on this page.</p>
            </article>
        </main>
    );
}
