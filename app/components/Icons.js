// Shared icon set (24px grid, stroke icons). Usage:  <IconFolder size={16} className="..." />
// Icons inherit the text colour (currentColor). No emoji anywhere in the UI: use these instead.
import React from 'react';

function make(name, children) {
    const Icon = function Icon({ size = 16, className = '', strokeWidth = 1.8, ...rest }) {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
                focusable="false"
                {...rest}
            >
                {children}
            </svg>
        );
    };
    Icon.displayName = name;
    return Icon;
}

export const IconDashboard = make('IconDashboard', <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>);
export const IconHome = make('IconHome', <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" />);
export const IconFolder = make('IconFolder', <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />);
export const IconFile = make('IconFile', <><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5" /></>);
export const IconFilm = make('IconFilm', <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>);
export const IconVideo = make('IconVideo', <><rect x="3" y="6" width="12" height="12" rx="2" /><path d="M15 10l6-3v10l-6-3" /></>);
export const IconUpload = make('IconUpload', <path d="M12 16V4m0 0L7 9m5-5l5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />);
export const IconDownload = make('IconDownload', <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" />);
export const IconGlobe = make('IconGlobe', <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 4 5.7 4 9s-1.5 6.3-4 9c-2.5-2.7-4-5.7-4-9s1.5-6.3 4-9" /></>);
export const IconCloud = make('IconCloud', <path d="M17.5 19H8a5 5 0 01-.7-9.95A6 6 0 0118.5 8.5 5.25 5.25 0 0117.5 19z" />);
export const IconIdCard = make('IconIdCard', <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6.5 16c.5-1.5 1.7-2 2.5-2s2 .5 2.5 2M14 10h4M14 13h3" /></>);
export const IconLaptop = make('IconLaptop', <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>);
export const IconSliders = make('IconSliders', <><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>);
export const IconGear = make('IconGear', <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>);
export const IconBolt = make('IconBolt', <path d="M13 3L5 13h6l-1 8 8-10h-6z" />);
export const IconChart = make('IconChart', <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />);
export const IconActivity = make('IconActivity', <path d="M3 12h4l3-8 4 16 3-8h4" />);
export const IconKey = make('IconKey', <><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2L20 3m-3 3l3 3m-5-1l2 2" /></>);
export const IconPlay = make('IconPlay', <path d="M7 4l13 8-13 8z" />);
export const IconLink = make('IconLink', <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />);
export const IconCopy = make('IconCopy', <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></>);
export const IconTrash = make('IconTrash', <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />);
export const IconPencil = make('IconPencil', <><path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>);
export const IconWrench = make('IconWrench', <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />);
export const IconSearch = make('IconSearch', <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>);
export const IconCheck = make('IconCheck', <path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconX = make('IconX', <path d="M6 6l12 12M18 6L6 18" />);
export const IconMenu = make('IconMenu', <path d="M4 6h16M4 12h16M4 18h16" />);
export const IconPlus = make('IconPlus', <path d="M12 5v14M5 12h14" />);
export const IconChevronDown = make('IconChevronDown', <path d="M6 9l6 6 6-6" />);
export const IconChevronUp = make('IconChevronUp', <path d="M6 15l6-6 6 6" />);
export const IconChevronRight = make('IconChevronRight', <path d="M9 6l6 6-6 6" />);
export const IconChevronLeft = make('IconChevronLeft', <path d="M15 6l-6 6 6 6" />);
export const IconShield = make('IconShield', <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />);
export const IconShieldCheck = make('IconShieldCheck', <><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>);
export const IconServer = make('IconServer', <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>);
export const IconDatabase = make('IconDatabase', <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>);
export const IconRefresh = make('IconRefresh', <path d="M20 11a8 8 0 00-14.9-3M4 5v4h4M4 13a8 8 0 0014.9 3M20 19v-4h-4" />);
export const IconClock = make('IconClock', <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconLayers = make('IconLayers', <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>);
export const IconAlert = make('IconAlert', <><path d="M10.3 4l-8 14a2 2 0 001.7 3h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z" /><path d="M12 10v4M12 17.5h.01" /></>);
export const IconInfo = make('IconInfo', <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);
export const IconCheckCircle = make('IconCheckCircle', <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>);
export const IconXCircle = make('IconXCircle', <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>);
export const IconLock = make('IconLock', <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>);
export const IconLogout = make('IconLogout', <path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4M16 8l4 4-4 4M20 12H9" />);
export const IconUser = make('IconUser', <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>);
export const IconMail = make('IconMail', <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>);
export const IconEye = make('IconEye', <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const IconEyeOff = make('IconEyeOff', <path d="M3 3l18 18M10.6 6.2A9.7 9.7 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.2 3.9M6.6 7.6A16.8 16.8 0 002 12s3.5 7 10 7a9.6 9.6 0 004.3-1" />);
export const IconFilter = make('IconFilter', <path d="M3 5h18l-7 8v6l-4 2v-8z" />);
export const IconCode = make('IconCode', <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />);
export const IconExternal = make('IconExternal', <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />);
export const IconZap = IconBolt;
export const IconUsers = make('IconUsers', <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 20a6.5 6.5 0 00-3-5.5" /></>);
export const IconFullscreen = make('IconFullscreen', <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const IconRotate = make('IconRotate', <path d="M20 11a8 8 0 00-14.9-3M4 5v4h4" />);
export const IconRotateCw = make('IconRotateCw', <path d="M4 13a8 8 0 0014.9 3M20 19v-4h-4M4 11a8 8 0 0114.9-3M20 5v4h-4" />);
export const IconGrid = IconDashboard;
export const IconStar = make('IconStar', <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />);
export const IconTerminal = make('IconTerminal', <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></>);
export const IconInbox = make('IconInbox', <path d="M3 13l3-8h12l3 8v6a1 1 0 01-1 1H4a1 1 0 01-1-1zM3 13h5l1 3h6l1-3h5" />);
