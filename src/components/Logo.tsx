export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden>
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a2050" />
          <stop offset="1" stopColor="#0a0d1c" />
        </linearGradient>
        <linearGradient id="lg-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A5B4FF" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#lg-bg)" />
      <rect x="2" y="2" width="508" height="508" rx="114" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="4" />
      <path d="M152 362 V150 L360 362 V150" fill="none" stroke="url(#lg-stroke)" strokeWidth="54" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M398 104 l11 29 29 11 -29 11 -11 29 -11 -29 -29 -11 29 -11z" fill="#fff" fillOpacity="0.95" />
    </svg>
  );
}
