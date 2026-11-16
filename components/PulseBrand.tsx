import React from "react";

export function PulseMark({ className = "" }: { className?: string }) {
  return (
    <span className={`pulse-mark ${className}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <path
          d="M20 33S6 24.4 6 14.9C6 7.7 15.2 5.2 20 12c4.8-6.8 14-4.3 14 2.9C34 24.4 20 33 20 33Z"
          fill="currentColor"
        />
        <path
          d="M10 20h6l2-5 4 11 2-6h6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function NavIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    DASHBOARD: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    SCHEDULE: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18m-13 5 3 3 5-5" />
      </>
    ),
    ACTIVITY: (
      <>
        <path d="M4 4h16l2 12v4H2v-4L4 4Z" />
        <path d="M2 16h6l2 3h4l2-3h6M8 8h8m-8 4h5" />
      </>
    ),
    LIST: (
      <>
        <rect x="5" y="4" width="16" height="18" rx="3" />
        <path d="M9 4V2h8v2M8 11l2 2 4-4m-6 9h8" />
      </>
    ),
    DISPATCH: (
      <>
        <circle cx="8" cy="7" r="3" />
        <path d="M2 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m2 5a5 5 0 0 1 4 5" />
      </>
    ),
    WORKFORCE: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="3" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a23 23 0 0 0 18 0m-9 0v4" />
      </>
    ),
    TEAM: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3m2-13h6m-3-3v6" />
      </>
    ),
    REPORTS: (
      <>
        <path d="M4 3v18h17M8 16v-4m5 4V8m5 8V5" />
      </>
    ),
    AUDIT: (
      <>
        <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M8 8h6m-6 5h3m3 1L22 6l-4-4-8 8-1 5 5-1Z" />
      </>
    ),
    IMPORTS: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M3 16v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4" />
      </>
    ),
    INTEGRATIONS: (
      <>
        <path d="m9 15 6-6m-8 3-2 2a4 4 0 0 0 5 6l3-3m-2-10 3-3a4 4 0 1 1 6 6l-3 3" />
      </>
    ),
    SETTINGS: (
      <>
        <path d="m10 3-1 3-3 1-3-1-1 4 2 2-1 3 2 3 3-1 2 2 4-1 1-3 3-1 1-4-3-2V7l-3-2-3 1-2-3Z" />
        <circle cx="11" cy="11" r="3" />
      </>
    ),
    HELP: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 1 1 5 2c-2 1-2 1-2 3m0 3h.01" />
      </>
    ),
    REFRESH: (
      <>
        <path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" />
      </>
    ),
    MENU: <path d="M4 6h16M4 12h16M4 18h16" />,
  };
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.WORKFORCE}
    </svg>
  );
}
