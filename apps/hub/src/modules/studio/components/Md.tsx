"use client";

import ReactMarkdown from "react-markdown";

/**
 * Full markdown renderer — for long-form AI text (aiProfile, etc.)
 * h2 headings are NOT rendered here; sections are split upstream and
 * the section title is rendered by the parent with custom styling.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => (
          <h2 className="text-sm font-bold text-[#023435] dark:text-foreground mt-4 mb-2 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-zinc-700 mt-3 mb-1.5">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-zinc-600 leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => <ul className="space-y-0.5 mb-2 pl-0">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-0.5 mb-2 pl-0 list-none">{children}</ol>,
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-zinc-600 leading-relaxed">
            <span className="text-zinc-400 shrink-0 mt-0.5 select-none">•</span>
            <span>{children}</span>
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-zinc-800">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        hr: () => null,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

/**
 * Inline markdown — handles **bold** and *italic* only.
 * Use for short card text fields (objective, descriptions, notes).
 */
export function InlineMd({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        return part;
      })}
    </span>
  );
}
