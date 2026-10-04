import type { ReactNode } from 'react';

/** Root-screen title block in the content: optional date chip, large title, then e.g. search. */
export function ScreenTitle({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <div className="gt-screen-title">
      {eyebrow && <span className="gt-eyebrow">{eyebrow}</span>}
      <h1 className="gt-title">{title}</h1>
      {children}
    </div>
  );
}
