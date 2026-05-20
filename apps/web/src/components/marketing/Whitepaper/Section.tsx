// ─── Section ──────────────────────────────────────────────────────────────────

export interface WhitepaperSection {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  content: string;
}

interface SectionProps {
  section: WhitepaperSection;
}

export function Section({ section }: SectionProps) {
  const { id, level, title, content } = section;

  const headingId = `section-${id}`;

  return (
    <section
      id={headingId}
      aria-labelledby={`heading-${id}`}
      className="scroll-mt-24 mb-12"
    >
      {level === 1 && (
        <h1
          id={`heading-${id}`}
          className="font-display text-3xl md:text-4xl text-content-primary tracking-wide mb-6 pb-3 border-b border-stroke-base"
        >
          <span className="text-gold-400 mr-3" aria-hidden="true">
            ✦
          </span>
          {title}
        </h1>
      )}

      {level === 2 && (
        <h2
          id={`heading-${id}`}
          className="font-display text-2xl md:text-3xl text-content-primary tracking-wide mb-4 mt-2"
        >
          <span className="text-veil-400 mr-2 text-xl" aria-hidden="true">
            ◈
          </span>
          {title}
        </h2>
      )}

      {level === 3 && (
        <h3
          id={`heading-${id}`}
          className="font-body text-xl text-content-primary font-semibold mb-3 mt-1 text-shard-300"
        >
          {title}
        </h3>
      )}

      <div
        className="font-body text-content-secondary leading-relaxed max-w-[65ch] space-y-4"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </section>
  );
}
