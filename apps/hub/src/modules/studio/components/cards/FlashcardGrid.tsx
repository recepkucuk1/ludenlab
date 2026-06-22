"use client";

export interface FlashcardItem {
  word?: string;
  sentence?: string;
  imageUrl?: string;
}

function highlightSound(text: string, sounds: string[]) {
  if (!sounds.length) return <>{text}</>;
  const letters = sounds.map((s) => s.replace(/\//g, "")).filter(Boolean);
  if (!letters.length) return <>{text}</>;
  const esc = (l: string) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const splitRe = new RegExp(`(${letters.map(esc).join("|")})`, "gi");
  const isMatch = new RegExp(`^(?:${letters.map(esc).join("|")})$`, "i"); // non-global, anchored → stateless
  const parts = text.split(splitRe);
  return (
    <>
      {parts.map((part, i) =>
        isMatch.test(part) ? (
          <span key={i} className="font-extrabold text-[var(--poster-accent)]">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function FlashcardGrid({
  items,
  sounds,
  showSentence = false,
  busy = false,
}: {
  items: FlashcardItem[];
  sounds: string[];
  showSentence?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex flex-col items-center rounded-xl border-2 border-[var(--poster-ink)] bg-white p-3 text-center shadow-[0_2px_0_var(--poster-ink)]"
        >
          <div className="flex h-28 w-28 items-center justify-center">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.word ?? ""} className="h-28 w-28 object-contain" />
            ) : busy ? (
              <span className="animate-pulse text-xs font-bold text-[var(--poster-ink-3)]">görsel…</span>
            ) : (
              <span className="text-2xl text-[var(--poster-ink-faint)]">—</span>
            )}
          </div>
          <p className="mt-2 text-lg font-bold text-[var(--poster-ink)]">
            {highlightSound(item.word ?? "", sounds)}
          </p>
          {showSentence && item.sentence && (
            <p className="mt-1 text-xs leading-snug text-[var(--poster-ink-2)]">
              {highlightSound(item.sentence, sounds)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
