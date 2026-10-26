const BeeLogo = ({ size = 32, className = '' }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        focusable="false"
    >
        <ellipse cx="12.5" cy="13" rx="5.5" ry="7.5" transform="rotate(-28 12.5 13)" fill="var(--bee-wing-fill)" stroke="var(--bee-wing-stroke)" strokeWidth="1.6" />
        <ellipse cx="27.5" cy="13" rx="5.5" ry="7.5" transform="rotate(28 27.5 13)" fill="var(--bee-wing-fill)" stroke="var(--bee-wing-stroke)" strokeWidth="1.6" />
        <path d="M16 11.5C12.8 7.8 12 5.2 13 3.5M24 11.5c3.2-3.7 4-6.3 3-8" stroke="var(--bee-stripe)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="13" cy="3.5" r="1.2" fill="var(--bee-stripe)" />
        <circle cx="27" cy="3.5" r="1.2" fill="var(--bee-stripe)" />
        <ellipse cx="20" cy="23" rx="9" ry="12" fill="var(--bee-body)" stroke="var(--bee-stripe)" strokeWidth="1.8" />
        <path d="M12 18.5c4.4 2.2 11.6 2.2 16 0M11.3 25c4.8 2.1 12.6 2.1 17.4 0" stroke="var(--bee-stripe)" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="17" cy="15" r="1" fill="var(--bee-stripe)" />
        <circle cx="23" cy="15" r="1" fill="var(--bee-stripe)" />
    </svg>
);

export default BeeLogo;
