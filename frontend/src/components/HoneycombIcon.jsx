const HoneycombIcon = ({ size = 26, className = '' }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M14 0 21 4v8l-7 4-7-4V4l7-4Z" fill="var(--header-gradient-end)" stroke="var(--primary-text)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m7 12 7 4v8l-7 4-7-4v-8l7-4Z" fill="var(--accent)" stroke="var(--primary-text)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m21 12 7 4v8l-7 4-7-4v-8l7-4Z" fill="var(--header-gradient-end)" stroke="var(--primary-text)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
);

export default HoneycombIcon;
