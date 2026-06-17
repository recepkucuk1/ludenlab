/** LudenLab marka kilidi (logo + wordmark) — auth/giriş yüzeylerinde paylaşılır. */
export function Brand() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <svg width={30} height={30} viewBox="0 0 32 32" fill="none" stroke="var(--poster-accent)" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(34 16 16)" />
        <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-34 16 16)" />
      </svg>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21, color: "var(--poster-deep-teal)", letterSpacing: "-0.02em" }}>
        LudenLab
      </span>
    </span>
  );
}
